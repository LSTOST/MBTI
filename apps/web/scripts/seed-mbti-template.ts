/**
 * 把硬编码的 MBTI 题目导入数据库的 TestTemplate + TestQuestion。
 * 同时把历史 Report.testId 回填为 mbti-love。
 *
 * 可重复执行（所有写入走 upsert / skipDuplicates）。
 *
 * 使用：
 *   cd apps/web && node scripts/seed-mbti-template.ts
 * 或：
 *   npm run seed:mbti
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";
import { quizQuestions } from "../features/quiz/questions";
import { advancedQuestions, FACET_META } from "../features/quiz/advanced-questions";

const MBTI_LOVE_SLUG = "mbti-love";
const MBTI_LOVE_ADVANCED_SLUG = "mbti-love-advanced";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/mbti?schema=public",
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // --- 主测试（36 题） ---
  const mainTemplate = await prisma.testTemplate.upsert({
    where: { slug: MBTI_LOVE_SLUG },
    create: {
      slug: MBTI_LOVE_SLUG,
      name: "MBTI 恋爱匹配",
      tagline: "36 题看清你的恋爱人格",
      description: "基于 MBTI 四维度 × 12 星座，输出你的理想型与高风险对象。",
      status: "published",
      accessMode: "public",
      pricingMode: "paid_unlock",
      basePrice: 990,                // 9.9 CNY
      aiPrice: 1990,                 // 19.9 CNY
      reportStrategy: "mbti_compatibility",
      scoringConfig: {
        dimensions: ["EI", "SN", "TF", "JP"],
        /// 每个维度的两极及打破平局
        poles: {
          EI: { left: "E", right: "I", tieBreaker: "I" },
          SN: { left: "S", right: "N", tieBreaker: "N" },
          TF: { left: "T", right: "F", tieBreaker: "F" },
          JP: { left: "J", right: "P", tieBreaker: "J" },
        },
        /// Likert 归一化：value - centerValue，再累加到维度。
        likert: { min: 1, max: 5, centerValue: 3 },
      },
      sortOrder: 0,
      publishedAt: new Date(),
    },
    update: {}, // 已存在时不覆盖运营已改动的元信息
  });

  await prisma.$transaction(async (tx) => {
    for (const q of quizQuestions) {
      await tx.testQuestion.upsert({
        where: { testId_questionKey: { testId: mainTemplate.id, questionKey: q.id } },
        create: {
          testId: mainTemplate.id,
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
        },
        update: {
          orderIndex: q.index,
          prompt: q.prompt,
          dimension: q.dimension,
          config: {
            leftPole: q.leftPole,
            rightPole: q.rightPole,
            leftLabel: q.leftLabel,
            rightLabel: q.rightLabel,
          },
        },
      });
    }
  });

  // --- 高级测试（24 题，12 facets） ---
  const advancedTemplate = await prisma.testTemplate.upsert({
    where: { slug: MBTI_LOVE_ADVANCED_SLUG },
    create: {
      slug: MBTI_LOVE_ADVANCED_SLUG,
      name: "MBTI 恋爱子维度",
      tagline: "24 题深挖 12 个子维度，看清你具体在哪些场景像 T 或 F",
      description: "在基础 MBTI 之上，用 12 个 facet 对恋爱行为做更细粒度刻画。",
      status: "published",
      accessMode: "public",
      pricingMode: "free",
      basePrice: 0,
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
      publishedAt: new Date(),
    },
    update: {},
  });

  await prisma.$transaction(async (tx) => {
    for (const q of advancedQuestions) {
      await tx.testQuestion.upsert({
        where: { testId_questionKey: { testId: advancedTemplate.id, questionKey: q.id } },
        create: {
          testId: advancedTemplate.id,
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
        },
        update: {
          orderIndex: q.index,
          prompt: q.prompt,
          dimension: q.dimension,
          config: {
            facet: q.facet,
            leftPole: q.leftPole,
            rightPole: q.rightPole,
            leftLabel: q.leftLabel,
            rightLabel: q.rightLabel,
          },
        },
      });
    }
  });

  // --- 回填历史 Report.testId ---
  const backfilled = await prisma.report.updateMany({
    where: { testId: null },
    data: { testId: mainTemplate.id },
  });

  // 注：历史 Order.originalAmount 留空（读时 fallback 到 amount），不做一次性回填。

  // --- 注册埋点事件目录（从 lib/analytics.ts 复刻） ---
  const events: Array<{
    name: string;
    displayName: string;
    category: string;
    description: string;
  }> = [
    { name: "started_quiz", displayName: "开始测试", category: "quiz", description: "用户点击开始测试按钮" },
    { name: "submitted_quiz", displayName: "提交测试", category: "quiz", description: "答完 36 题并提交；含 checkpoint 事件（第 5/10/20 题）" },
    { name: "viewed_free_report", displayName: "查看免费报告", category: "quiz", description: "免费报告页浏览" },
    { name: "clicked_pay", displayName: "点击解锁付费", category: "payment", description: "点击解锁深度报告 CTA" },
    { name: "paid_report", displayName: "支付成功", category: "payment", description: "支付回调成功，订单置 paid" },
    { name: "redeemed_with_code", displayName: "兑换码核销", category: "payment", description: "使用兑换码解锁（老语义）或进入测试（新语义）" },
    { name: "clicked_ai", displayName: "点击 AI 报告", category: "quiz", description: "点击生成 AI 深度报告" },
    { name: "ai_completed", displayName: "AI 报告完成", category: "quiz", description: "AI 生成完成" },
    { name: "ai_failed", displayName: "AI 报告失败", category: "quiz", description: "AI 生成失败（含失败原因）" },
    { name: "clicked_share", displayName: "点击分享", category: "share", description: "触发分享 CTA" },
    { name: "share_success", displayName: "分享完成", category: "share", description: "分享成功回传" },
  ];

  for (const ev of events) {
    await prisma.trackedEvent.upsert({
      where: { name: ev.name },
      create: { ...ev, properties: [] },
      update: { displayName: ev.displayName, category: ev.category, description: ev.description },
    });
  }

  console.log(`✓ Seeded TestTemplate: ${mainTemplate.slug} (${quizQuestions.length} questions)`);
  console.log(`✓ Seeded TestTemplate: ${advancedTemplate.slug} (${advancedQuestions.length} questions)`);
  console.log(`✓ Backfilled ${backfilled.count} legacy Report rows → testId=${mainTemplate.id}`);
  console.log(`✓ Registered ${events.length} tracked events`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
