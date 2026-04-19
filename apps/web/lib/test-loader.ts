/**
 * 测试模板加载器。
 *
 * 优先从 DB 的 TestTemplate + TestQuestion 读取；若 DB 不可达或记录未填充，
 * 对两个已知的 MBTI 模板回退到硬编码题库，保证线上不宕。
 *
 * 后续新增测试：进 DB，不再需要硬编码。旧 MBTI 的硬编码只是安全网。
 */

import { prisma } from "@/lib/db";
import type { TestAccessMode, TestPricingMode, TestStatus } from "@/generated/prisma/enums";

import { quizQuestions } from "@/features/quiz/questions";
import { advancedQuestions, FACET_META } from "@/features/quiz/advanced-questions";

export type LoadedQuestion = {
  id: string;
  /** DB 行 id；fallback 时留空字符串 */
  dbId: string;
  questionKey: string;
  orderIndex: number;
  type: "likert_5" | "single_choice" | "multi_choice";
  prompt: string;
  dimension: string | null;
  /** Likert: { leftPole, rightPole, leftLabel, rightLabel, facet? }；choice: { options: [...] } */
  config: Record<string, unknown>;
};

export type LoadedTest = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  coverImage: string | null;
  status: TestStatus;
  accessMode: TestAccessMode;
  pricingMode: TestPricingMode;
  basePrice: number;
  aiPrice: number | null;
  reportStrategy: string;
  scoringConfig: unknown;
  sortOrder: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  questionCount: number;
  /** 从 DB 来还是 fallback */
  source: "db" | "fallback";
};

export type LoadedTestWithQuestions = LoadedTest & {
  questions: LoadedQuestion[];
};

const FALLBACK_SLUGS = {
  main: "mbti-love",
  advanced: "mbti-love-advanced",
} as const;

/** 列出所有测试（后台用，包含 draft/archived）。DB 不可达时返回 fallback 两条。 */
export async function listAllTests(): Promise<LoadedTest[]> {
  try {
    const rows = await prisma.testTemplate.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { questions: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      tagline: r.tagline,
      description: r.description,
      coverImage: r.coverImage,
      status: r.status,
      accessMode: r.accessMode,
      pricingMode: r.pricingMode,
      basePrice: r.basePrice,
      aiPrice: r.aiPrice,
      reportStrategy: r.reportStrategy,
      scoringConfig: r.scoringConfig,
      sortOrder: r.sortOrder,
      publishedAt: r.publishedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      questionCount: r._count.questions,
      source: "db" as const,
    }));
  } catch (err) {
    console.warn("[test-loader] listAllTests DB unreachable, using fallback:", errMessage(err));
    return [fallbackMain(), fallbackAdvanced()];
  }
}

/** 按 slug 加载单个测试（含题目）。供 /quiz/[testSlug] 使用。 */
export async function loadTestBySlug(slug: string): Promise<LoadedTestWithQuestions | null> {
  try {
    const row = await prisma.testTemplate.findUnique({
      where: { slug },
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
      },
    });
    if (!row) {
      return fallbackBySlug(slug);
    }
    return {
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
      scoringConfig: row.scoringConfig,
      sortOrder: row.sortOrder,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      questionCount: row.questions.length,
      source: "db",
      questions: row.questions.map((q) => ({
        id: q.id,
        dbId: q.id,
        questionKey: q.questionKey,
        orderIndex: q.orderIndex,
        type: q.type,
        prompt: q.prompt,
        dimension: q.dimension,
        config: (q.config as Record<string, unknown>) ?? {},
      })),
    };
  } catch (err) {
    console.warn(
      `[test-loader] loadTestBySlug(${slug}) DB unreachable, using fallback:`,
      errMessage(err),
    );
    return fallbackBySlug(slug);
  }
}

// ─────────── fallback ───────────

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function fallbackBySlug(slug: string): LoadedTestWithQuestions | null {
  if (slug === FALLBACK_SLUGS.main) {
    const tpl = fallbackMain();
    return {
      ...tpl,
      questions: quizQuestions.map((q) => ({
        id: q.id,
        dbId: "",
        questionKey: q.id,
        orderIndex: q.index,
        type: "likert_5",
        prompt: q.prompt,
        dimension: q.dimension,
        config: {
          leftPole: q.leftPole,
          rightPole: q.rightPole,
          leftLabel: q.leftLabel,
          rightLabel: q.rightLabel,
        },
      })),
    };
  }
  if (slug === FALLBACK_SLUGS.advanced) {
    const tpl = fallbackAdvanced();
    return {
      ...tpl,
      questions: advancedQuestions.map((q) => ({
        id: q.id,
        dbId: "",
        questionKey: q.id,
        orderIndex: q.index,
        type: "likert_5",
        prompt: q.prompt,
        dimension: q.dimension,
        config: {
          facet: q.facet,
          leftPole: q.leftPole,
          rightPole: q.rightPole,
          leftLabel: q.leftLabel,
          rightLabel: q.rightLabel,
        },
      })),
    };
  }
  return null;
}

function fallbackMain(): LoadedTest {
  return {
    id: "fallback-mbti-love",
    slug: FALLBACK_SLUGS.main,
    name: "MBTI 恋爱匹配",
    tagline: "36 题看清你的恋爱人格",
    description: "基于 MBTI 四维度 × 12 星座，输出你的理想型与高风险对象。",
    coverImage: null,
    status: "published",
    accessMode: "public",
    pricingMode: "paid_unlock",
    basePrice: 990,
    aiPrice: 1990,
    reportStrategy: "mbti_compatibility",
    scoringConfig: {
      dimensions: ["EI", "SN", "TF", "JP"],
      poles: {
        EI: { left: "E", right: "I", tieBreaker: "I" },
        SN: { left: "S", right: "N", tieBreaker: "N" },
        TF: { left: "T", right: "F", tieBreaker: "F" },
        JP: { left: "J", right: "P", tieBreaker: "J" },
      },
      likert: { min: 1, max: 5, centerValue: 3 },
    },
    sortOrder: 0,
    publishedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    questionCount: quizQuestions.length,
    source: "fallback",
  };
}

function fallbackAdvanced(): LoadedTest {
  return {
    id: "fallback-mbti-love-advanced",
    slug: FALLBACK_SLUGS.advanced,
    name: "MBTI 恋爱子维度",
    tagline: "24 题深挖 12 个子维度",
    description: "在基础 MBTI 之上，用 12 个 facet 对恋爱行为做更细粒度刻画。",
    coverImage: null,
    status: "published",
    accessMode: "public",
    pricingMode: "free",
    basePrice: 0,
    aiPrice: null,
    reportStrategy: "mbti_facet",
    scoringConfig: {
      dimensions: ["EI", "SN", "TF", "JP"],
      facets: Object.fromEntries(
        Object.entries(FACET_META).map(([key, meta]) => [
          key,
          {
            dimension: meta.dimension,
            label: meta.label,
            leftPoleLabel: meta.leftPoleLabel,
            rightPoleLabel: meta.rightPoleLabel,
          },
        ]),
      ),
      likert: { min: 1, max: 5, centerValue: 3 },
    },
    sortOrder: 1,
    publishedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    questionCount: advancedQuestions.length,
    source: "fallback",
  };
}
