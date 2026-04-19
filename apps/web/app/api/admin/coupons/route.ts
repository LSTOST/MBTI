import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

const createSchema = z
  .object({
    /** 用户输入的码；服务端做 .toUpperCase().trim() 后存 codeNormalized */
    code: z
      .string()
      .min(2)
      .max(40)
      .regex(/^[A-Za-z0-9_\-]+$/, "优惠码仅允许字母/数字/下划线/短横线"),
    type: z.enum(["percent_off", "amount_off"]),
    /** percent_off: 1-100；amount_off: 分 */
    value: z.coerce.number().int().min(1).max(10_000_000),
    scope: z.enum(["global", "test"]).default("global"),
    testId: z.string().optional(),
    minAmount: z.coerce.number().int().min(0).default(0),
    maxRedemptions: z.coerce.number().int().min(1).nullable().optional(),
    perUserLimit: z.coerce.number().int().min(1).nullable().default(1),
    startsAt: z.string().datetime().nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    note: z.string().max(500).optional(),
  })
  .strict()
  .refine(
    (d) => {
      if (d.type === "percent_off" && (d.value < 1 || d.value > 100)) return false;
      return true;
    },
    { message: "percent_off 的 value 必须在 1–100 之间", path: ["value"] },
  )
  .refine(
    (d) => d.scope !== "test" || !!d.testId,
    { message: "scope=test 时必须提供 testId", path: ["testId"] },
  );

export async function GET(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const url = new URL(req.url);
    const active = url.searchParams.get("active");
    const scope = url.searchParams.get("scope");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = 50;

    const where: Record<string, unknown> = {};
    if (active === "1" || active === "true") where.active = true;
    if (active === "0" || active === "false") where.active = false;
    if (scope) where.scope = scope;

    const [rows, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { uses: true } },
          test: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.coupon.count({ where }),
    ]);

    return NextResponse.json({
      items: rows.map((c) => ({
        id: c.id,
        code: c.codeNormalized,
        type: c.type,
        value: c.value,
        scope: c.scope,
        testId: c.testId,
        testName: c.test?.name ?? null,
        minAmount: c.minAmount,
        maxRedemptions: c.maxRedemptions,
        redemptionCount: c.redemptionCount,
        perUserLimit: c.perUserLimit,
        startsAt: c.startsAt?.toISOString() ?? null,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        active: c.active,
        note: c.note,
        usesCount: c._count.uses,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[admin/coupons GET]", error);
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

    const codeNormalized = data.code.toUpperCase().trim();
    const clash = await prisma.coupon.findUnique({ where: { codeNormalized } });
    if (clash) {
      return NextResponse.json({ error: "优惠码已存在" }, { status: 409 });
    }

    if (data.testId) {
      const test = await prisma.testTemplate.findUnique({ where: { id: data.testId }, select: { id: true } });
      if (!test) {
        return NextResponse.json({ error: "绑定的测试不存在" }, { status: 404 });
      }
    }

    const row = await prisma.coupon.create({
      data: {
        codeNormalized,
        type: data.type,
        value: data.value,
        scope: data.scope,
        testId: data.testId ?? null,
        minAmount: data.minAmount,
        maxRedemptions: data.maxRedemptions ?? null,
        perUserLimit: data.perUserLimit ?? 1,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        note: data.note ?? null,
      },
    });

    await recordAudit({
      action: "coupon.create",
      targetType: "Coupon",
      targetId: row.id,
      diff: { code: codeNormalized, type: row.type, value: row.value, scope: row.scope },
      request: req,
    });

    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/coupons POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 },
    );
  }
}
