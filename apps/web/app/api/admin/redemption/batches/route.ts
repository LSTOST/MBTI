import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

/** 码格式：系统随机 or 自定义前缀 + 随机尾 */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(prefix: string, length: number): string {
  const tail = Array.from({ length }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join("");
  return prefix ? `${prefix}-${tail}` : tail;
}

function makeUniqueCode(prefix: string, tailLen: number, existing: Set<string>): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCode(prefix, tailLen);
    if (!existing.has(code)) {
      existing.add(code);
      return code;
    }
  }
  throw new Error("生成唯一码失败，请减少数量或增加码长");
}

const createSchema = z
  .object({
    name: z.string().min(1).max(100),
    testId: z.string().nullable().optional(),
    note: z.string().max(500).optional(),
    count: z.coerce.number().int().min(1).max(5000),
    maxRedemptions: z.coerce.number().int().min(1).default(1),
    expiresAt: z.string().datetime().nullable().optional(),
    prefix: z
      .string()
      .max(12)
      .regex(/^[A-Za-z0-9]*$/, "前缀仅允许字母/数字")
      .optional(),
    /** 随机尾长度，默认 8 */
    tailLength: z.coerce.number().int().min(4).max(16).default(8),
  })
  .strict();

/**
 * GET /api/admin/redemption/batches
 * 批次列表，含聚合：总量、已用、剩余（实时）。
 */
export async function GET(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = 30;

    const [rows, total] = await Promise.all([
      prisma.redemptionBatch.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          test: { select: { id: true, name: true, slug: true } },
          _count: { select: { codes: true } },
        },
      }),
      prisma.redemptionBatch.count(),
    ]);

    // 聚合每批次的已用量
    const batchIds = rows.map((r) => r.id);
    const usedAgg = await prisma.redemptionCode.groupBy({
      by: ["batchId"],
      where: { batchId: { in: batchIds } },
      _sum: { redemptionCount: true },
    });
    const usedMap = new Map(usedAgg.map((a) => [a.batchId, a._sum.redemptionCount ?? 0]));

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        testId: r.testId,
        testName: r.test?.name ?? null,
        note: r.note,
        codeCount: r._count.codes,
        usedCount: usedMap.get(r.id) ?? 0,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[admin/redemption/batches GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/redemption/batches
 * 批量生成。先写批次记录，再在事务内批量 createMany 码。
 */
export async function POST(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const raw = (await req.json()) as unknown;
    const data = createSchema.parse(raw);

    if (data.testId) {
      const test = await prisma.testTemplate.findUnique({
        where: { id: data.testId },
        select: { id: true },
      });
      if (!test) {
        return NextResponse.json({ error: "绑定的测试不存在" }, { status: 404 });
      }
    }

    const prefix = (data.prefix ?? "").toUpperCase().trim();
    const existingSet = new Set<string>();

    // 检查 DB 中是否存在前缀相同的码（避免生成已有码）
    if (prefix) {
      const existing = await prisma.redemptionCode.findMany({
        where: { codeNormalized: { startsWith: prefix + "-" } },
        select: { codeNormalized: true },
      });
      for (const e of existing) existingSet.add(e.codeNormalized);
    }

    const codes: string[] = [];
    for (let i = 0; i < data.count; i++) {
      codes.push(makeUniqueCode(prefix, data.tailLength, existingSet));
    }

    const batch = await prisma.redemptionBatch.create({
      data: {
        name: data.name,
        testId: data.testId ?? null,
        note: data.note ?? null,
        codeCount: data.count,
        codes: {
          createMany: {
            data: codes.map((code) => ({
              codeNormalized: code,
              testId: data.testId ?? null,
              maxRedemptions: data.maxRedemptions,
              expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            })),
          },
        },
      },
      select: { id: true, name: true },
    });

    await recordAudit({
      action: "redemption.batch.create",
      targetType: "RedemptionBatch",
      targetId: batch.id,
      diff: { name: batch.name, count: data.count, testId: data.testId ?? null },
      request: req,
    });

    return NextResponse.json({ ok: true, id: batch.id, count: data.count }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/redemption/batches POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 },
    );
  }
}
