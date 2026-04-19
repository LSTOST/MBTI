import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";
import { getReportStrategy, validateScoringConfig } from "@/lib/test-strategy";

type Context = {
  params: Promise<{ testId: string }>;
};

/**
 * 发布：校验通过后 status=published、publishedAt=now。
 * 校验项：
 *   - reportStrategy 已注册
 *   - scoringConfig 通过对应 strategy 的 Zod
 *   - 题目数 ≥ strategy.minQuestions
 *   - 定价字段与 pricingMode 合理（付费模式下 basePrice > 0）
 */
export async function POST(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { testId } = await context.params;
    const existing = await prisma.testTemplate.findUnique({
      where: { id: testId },
      include: { _count: { select: { questions: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }
    if (existing.status === "archived") {
      return NextResponse.json(
        { error: "已归档测试不可直接发布，请先恢复为草稿" },
        { status: 409 },
      );
    }

    const issues: string[] = [];

    const strategy = getReportStrategy(existing.reportStrategy);
    if (!strategy) {
      issues.push(`reportStrategy "${existing.reportStrategy}" 未注册`);
    } else {
      if (existing._count.questions < strategy.minQuestions) {
        issues.push(
          `题目数不足：当前 ${existing._count.questions}，${strategy.displayName} 至少需要 ${strategy.minQuestions} 题`,
        );
      }
      const cfg = validateScoringConfig(strategy.id, existing.scoringConfig);
      if (!cfg.ok) issues.push(...cfg.errors.map((e) => `scoringConfig: ${e}`));
    }

    if (existing.pricingMode !== "free" && existing.basePrice <= 0) {
      issues.push("付费模式 basePrice 必须大于 0（单位：分）");
    }
    if (existing.pricingMode === "paid_unlock" && existing.aiPrice !== null && existing.aiPrice < 0) {
      issues.push("aiPrice 不能为负");
    }

    if (issues.length > 0) {
      return NextResponse.json({ error: "发布校验未通过", issues }, { status: 422 });
    }

    const row = await prisma.testTemplate.update({
      where: { id: testId },
      data: {
        status: "published",
        publishedAt: existing.publishedAt ?? new Date(),
      },
    });

    await recordAudit({
      action: "test.publish",
      targetType: "TestTemplate",
      targetId: testId,
      diff: { from: existing.status, to: "published", slug: existing.slug },
      request: req,
    });

    return NextResponse.json({
      ok: true,
      id: row.id,
      status: row.status,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[admin/tests/:id/publish POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "发布失败" },
      { status: 500 },
    );
  }
}
