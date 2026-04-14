import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { generateRedeemCode, normalizeRedeemCode } from "@/lib/redeem-code";

const createSchema = z.object({
  code: z.string().optional(),
  maxRedemptions: z.coerce.number().int().positive().max(1_000_000),
  /** null 表示不设过期；须把 z.null() 放在 z.coerce.date() 前，避免 null 被错误转换 */
  expiresAt: z.union([z.null(), z.coerce.date()]).optional(),
  note: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get("limit") || "20", 10) || 20));
    const qRaw = url.searchParams.get("q")?.trim();
    const filter = url.searchParams.get("filter") || "all";

    const where: {
      active?: boolean;
      codeNormalized?: { contains: string; mode: "insensitive" };
    } = {};

    if (qRaw) {
      const needle = normalizeRedeemCode(qRaw);
      if (needle.length > 0) {
        where.codeNormalized = { contains: needle, mode: "insensitive" };
      }
    }
    if (filter === "enabled") where.active = true;
    if (filter === "disabled") where.active = false;

    const [total, rows, codesTotal, codesActive, usesTotal] = await Promise.all([
      prisma.redemptionCode.count({ where }),
      prisma.redemptionCode.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { uses: true } } },
      }),
      prisma.redemptionCode.count(),
      prisma.redemptionCode.count({ where: { active: true } }),
      prisma.redemptionUse.count(),
    ]);

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        code: r.codeNormalized,
        note: r.note,
        maxRedemptions: r.maxRedemptions,
        redemptionCount: r.redemptionCount,
        expiresAt: r.expiresAt?.toISOString() ?? null,
        active: r.active,
        createdAt: r.createdAt.toISOString(),
        useCount: r._count.uses,
      })),
      total,
      page,
      limit,
      overview: {
        codesTotal,
        codesActive,
        redemptionUsesTotal: usesTotal,
      },
    });
  } catch (error) {
    console.error("[admin/redeem-codes GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const raw = (await req.json()) as unknown;
    const data = createSchema.parse(raw);

    let normalized: string;
    if (data.code?.trim()) {
      normalized = normalizeRedeemCode(data.code);
      if (normalized.length < 3) {
        return NextResponse.json({ error: "兑换码至少 3 个有效字符" }, { status: 400 });
      }
    } else {
      normalized = generateRedeemCode(12);
    }

    const exists = await prisma.redemptionCode.findUnique({
      where: { codeNormalized: normalized },
    });
    if (exists) {
      return NextResponse.json({ error: "该兑换码已存在" }, { status: 409 });
    }

    const expiresAt =
      data.expiresAt === undefined ? null : data.expiresAt === null ? null : data.expiresAt;

    const row = await prisma.redemptionCode.create({
      data: {
        codeNormalized: normalized,
        maxRedemptions: data.maxRedemptions,
        expiresAt,
        note: data.note ?? null,
        active: data.active ?? true,
      },
    });

    return NextResponse.json({
      id: row.id,
      code: row.codeNormalized,
      note: row.note,
      maxRedemptions: row.maxRedemptions,
      redemptionCount: row.redemptionCount,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/redeem-codes POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 },
    );
  }
}
