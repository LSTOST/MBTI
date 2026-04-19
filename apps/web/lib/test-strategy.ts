/**
 * 报告策略注册表。
 *
 * 每种 reportStrategy 注册：
 *   - 一个 displayName / description：供后台测试管理页显示
 *   - 一个 scoringConfig 的 Zod schema：发布校验用
 *
 * 真正的计分与报告生成实现仍然在 features/* 里，由 services 层按 strategy 字符串 dispatch。
 * 这里只做「元信息 + 配置校验」的单一职责，保持可扩展（加一种新测试只改这一张表）。
 */

import { z } from "zod";

/** Likert 归一化配置：score = value - centerValue，再累计到维度。 */
const likertConfigSchema = z.object({
  min: z.number().int(),
  max: z.number().int(),
  centerValue: z.number(),
});

/** MBTI 四维两极配置：哪一极为 left/right，平票倒向哪一极。 */
const mbtiPoleSchema = z.object({
  left: z.string().min(1),
  right: z.string().min(1),
  tieBreaker: z.string().min(1),
});

/** mbti_compatibility：36 题主测试，4 维 × 9 题。 */
const mbtiCompatibilityConfigSchema = z.object({
  dimensions: z.array(z.string()).length(4),
  poles: z.record(z.string(), mbtiPoleSchema),
  likert: likertConfigSchema,
});

/** mbti_facet：24 题高级测试，12 个 facet，挂在 4 维下。 */
const mbtiFacetConfigSchema = z.object({
  dimensions: z.array(z.string()).length(4),
  facets: z.record(
    z.string(),
    z.object({
      dimension: z.string(),
      label: z.string(),
      leftPoleLabel: z.string(),
      rightPoleLabel: z.string(),
    }),
  ),
  likert: likertConfigSchema,
});

export type ReportStrategyId = "mbti_compatibility" | "mbti_facet";

export type ReportStrategyDefinition = {
  id: ReportStrategyId;
  displayName: string;
  description: string;
  /** 校验 TestTemplate.scoringConfig */
  schema: z.ZodTypeAny;
  /** 对题目数量的预期下限（发布时检查） */
  minQuestions: number;
};

export const REPORT_STRATEGIES: Record<ReportStrategyId, ReportStrategyDefinition> = {
  mbti_compatibility: {
    id: "mbti_compatibility",
    displayName: "MBTI × 星座配对",
    description:
      "4 维 × 9 题，输出 MBTI 四字母类型，并与用户星座组合穷举 192 种配对。配对评分由 features/compatibility/rules.ts 实现。",
    schema: mbtiCompatibilityConfigSchema,
    minQuestions: 4,
  },
  mbti_facet: {
    id: "mbti_facet",
    displayName: "MBTI 子维度深描",
    description:
      "12 个 facet × 2 题，挂在 4 个主维度之下，用于描述用户在具体场景里的 T/F、S/N 等倾向。",
    schema: mbtiFacetConfigSchema,
    minQuestions: 12,
  },
};

export function getReportStrategy(id: string): ReportStrategyDefinition | null {
  return (REPORT_STRATEGIES as Record<string, ReportStrategyDefinition>)[id] ?? null;
}

export function listReportStrategies(): ReportStrategyDefinition[] {
  return Object.values(REPORT_STRATEGIES);
}

/**
 * 校验 scoringConfig 是否符合 strategy 预期。
 * 失败时返回 errorMessages（人读格式）；成功返回 null。
 */
export function validateScoringConfig(
  strategyId: string,
  config: unknown,
): { ok: true } | { ok: false; errors: string[] } {
  const strategy = getReportStrategy(strategyId);
  if (!strategy) {
    return { ok: false, errors: [`未注册的 reportStrategy: ${strategyId}`] };
  }
  const result = strategy.schema.safeParse(config);
  if (result.success) return { ok: true };
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.join(".") || "(root)"} — ${i.message}`),
  };
}
