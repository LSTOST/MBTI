import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";
import { getReportStrategy } from "@/lib/test-strategy";

type Context = {
  params: Promise<{ testId: string }>;
};

const patchSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    slug: z
      .string()
      .min(2)
      .max(60)
      .regex(/^[a-z0-9-]+$/, "slug 仅允许小写字母、数字、短横线")
      .optional(),
    tagline: z.string().max(200).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    coverImage: z.string().url().max(500).nullable().optional(),
    accessMode: z.enum(["public", "redeem_required"]).optional(),
    pricingMode: z.enum(["free", "paid_unlock", "paid_entry"]).optional(),
    basePrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
    aiPrice: z.coerce.number().int().min(0).max(100_000_000).nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
    reportStrategy: z.string().min(1).max(60).optional(),
    scoringConfig: z.unknown().optional(),
  })
  .strict();

/** GET：测试详情（含题目总数、报告/订单统计）。 */
export async function GET(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { testId } = await context.params;

    const row = await prisma.testTemplate.findUnique({
      where: { id: testId },
      include: {
        _count: {
          select: { questions: true, reports: true, redemptionCodes: true, coupons: true },
        },
      },
    });
    if (!row) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }

    const strategy = getReportStrategy(row.reportStrategy);

    return NextResponse.json({
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      coverImage: row.coverImage,
      status: row.status,
      accessMode: row.accessMode,
      pricingMode: row.pricingMode,
      basePrice: row.basePrice,
      aiPrice: row.aiPrice,
      reportStrategy: row.reportStrategy,
      reportStrategyDisplayName: strategy?.displayName ?? null,
      scoringConfig: row.scoringConfig,
      sortOrder: row.sortOrder,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      counts: {
        questions: row._count.questions,
        reports: row._count.reports,
        redemptionCodes: row._count.redemptionCodes,
        coupons: row._count.coupons,
      },
    });
  } catch (error) {
    console.error("[admin/tests/:id GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

/** PATCH：更新元信息 / 定价 / 入口 / 策略配置。发布态也允许编辑，审计留痕。 */
export async function PATCH(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { testId } = await context.params;
    const raw = (await req.json()) as unknown;
    const data = patchSchema.parse(raw);

    const existing = await prisma.testTemplate.findUnique({ where: { id: testId } });
    if (!existing) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }

    // slug 唯一性
    if (data.slug && data.slug !== existing.slug) {
      const clash = await prisma.testTemplate.findUnique({ where: { slug: data.slug } });
      if (clash) {
        return NextResponse.json({ error: "slug 已被其他测试占用" }, { status: 409 });
      }
    }

    // 改 reportStrategy 时必须一并提供匹配的 scoringConfig —— 否则发布时才 Zod 报错成本太高
    if (data.reportStrategy && data.reportStrategy !== existing.reportStrategy) {
      const strategy = getReportStrategy(data.reportStrategy);
      if (!strategy) {
        return NextResponse.json(
          { error: `未注册的 reportStrategy: ${data.reportStrategy}` },
          { status: 400 },
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    for (const key of [
      "name",
      "slug",
      "tagline",
      "description",
      "coverImage",
      "accessMode",
      "pricingMode",
      "basePrice",
      "aiPrice",
      "sortOrder",
      "reportStrategy",
    ] as const) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    if (data.scoringConfig !== undefined) {
      updateData.scoringConfig = data.scoringConfig as never;
    }

    const row = await prisma.testTemplate.update({
      where: { id: testId },
      data: updateData,
    });

    await recordAudit({
      action: "test.update",
      targetType: "TestTemplate",
      targetId: testId,
      diff: { before: pickForAudit(existing), after: pickForAudit(row) },
      request: req,
    });

    return NextResponse.json({ ok: true, id: row.id, updatedAt: row.updatedAt.toISOString() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/tests/:id PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 },
    );
  }
}

/** DELETE：仅允许 draft 且无报告的模板删除。避免把历史报告孤立。 */
export async function DELETE(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { testId } = await context.params;
    const existing = await prisma.testTemplate.findUnique({
      where: { id: testId },
      include: { _count: { select: { reports: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }
    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "仅草稿态可删除；已发布 / 已归档请走归档流程" },
        { status: 409 },
      );
    }
    if (existing._count.reports > 0) {
      return NextResponse.json(
        { error: `已有 ${existing._count.reports} 份报告关联此测试，无法删除` },
        { status: 409 },
      );
    }

    await prisma.testTemplate.delete({ where: { id: testId } });

    await recordAudit({
      action: "test.delete",
      targetType: "TestTemplate",
      targetId: testId,
      diff: { slug: existing.slug, name: existing.name },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/tests/:id DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}

/** 审计 diff 里只留关键字段，避免 scoringConfig JSON 爆表。 */
function pickForAudit(t: {
  name: string;
  slug: string;
  status: string;
  accessMode: string;
  pricingMode: string;
  basePrice: number;
  aiPrice: number | null;
  reportStrategy: string;
  sortOrder: number;
}) {
  return {
    name: t.name,
    slug: t.slug,
    status: t.status,
    accessMode: t.accessMode,
    pricingMode: t.pricingMode,
    basePrice: t.basePrice,
    aiPrice: t.aiPrice,
    reportStrategy: t.reportStrategy,
    sortOrder: t.sortOrder,
  };
}
