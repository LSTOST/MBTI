import { randomBytes } from "node:crypto";

import { generateAiAnalysis } from "@/features/ai/generate-analysis";
import { buildCompatibilityReport, hydrateMatchDimensions } from "@/features/compatibility/rules";
import { buildReportSummary, toLockedPublicReport, unlockReport } from "@/features/report/composer";
import { advancedQuestions } from "@/features/quiz/advanced-questions";
import { quizQuestions } from "@/features/quiz/questions";
import { scoreFacets, scoreMbti } from "@/features/quiz/scoring";
import { getSunSign } from "@/features/zodiac/signs";
import { prisma } from "@/lib/db";
import { isUnavailableDatabaseError } from "@/lib/prisma-errors";
import type {
  AiAnalysisResult,
  AiAnalysisRequest,
  AiAnalysisSection,
  CreateReportRequest,
  FacetResult,
  PaidReportView,
  QuizAnswerInput,
  ReportRecord,
  UserProfileInput,
} from "@/lib/types";
import type { AiReportStatus, Gender, ReportRecordStatus } from "@/generated/prisma/enums";

function newReportSlug(): string {
  return randomBytes(8).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
}

function mapGender(g: UserProfileInput["gender"]): Gender {
  return g === "female" ? "female" : "male";
}

function buildAiRequest(
  profile: UserProfileInput,
  report: ReportRecord,
  reportId: string,
  dimensionStrengths?: { ei: number; sn: number; tf: number; jp: number },
): AiAnalysisRequest {
  const strengthLine = dimensionStrengths
    ? `四维倾向强度：E/I ${dimensionStrengths.ei}% · S/N ${dimensionStrengths.sn}% · T/F ${dimensionStrengths.tf}% · J/P ${dimensionStrengths.jp}%`
    : "";
  return {
    reportId,
    userProfileSummary: [
      `MBTI：${report.mbtiType}`,
      `太阳星座：${report.sunSign}`,
      strengthLine,
    ]
      .filter(Boolean)
      .join("；"),
    compatibilitySummary: `最佳匹配为 ${report.bestMatch.mbti} + ${report.bestMatch.zodiac}。优势：${report.strengths.join("；")}。风险：${report.conflicts.join("；")}。建议：${report.advice.join("；")}`,
    tonePreset: "sharp",
    language: "zh-CN",
  };
}

function prismaReportToRecord(r: {
  id: string;
  slug: string;
  userId: string;
  status: ReportRecordStatus;
  summary: string;
  nickname: string;
  createdAt: Date;
  mbtiType: string;
  sunSign: string;
  loveStyleLabel: string;
  bestMatch: unknown;
  topMatches: unknown;
  highRiskMatches: unknown;
  strengths: unknown;
  conflicts: unknown;
  advice: unknown;
  isPremiumLocked: boolean;
  matchRank: number;
  dimensionScores?: unknown;
}): ReportRecord {
  return {
    id: r.id,
    slug: r.slug,
    profileId: r.userId,
    status: r.status as ReportRecord["status"],
    summary: r.summary,
    nickname: r.nickname,
    createdAt: r.createdAt.toISOString(),
    mbtiType: r.mbtiType,
    sunSign: r.sunSign,
    loveStyleLabel: r.loveStyleLabel,
    bestMatch: r.bestMatch as ReportRecord["bestMatch"],
    topMatches: r.topMatches as ReportRecord["topMatches"],
    highRiskMatches: r.highRiskMatches as ReportRecord["highRiskMatches"],
    strengths: r.strengths as string[],
    conflicts: r.conflicts as string[],
    advice: r.advice as string[],
    isPremiumLocked: r.isPremiumLocked,
    matchRank: r.matchRank,
  };
}

function mapAiStatusToView(
  s: AiReportStatus,
): "not_started" | "processing" | "completed" | "failed" {
  if (s === "not_started") return "not_started";
  if (s === "processing") return "processing";
  if (s === "completed") return "completed";
  return "failed";
}

function prismaAiToResult(reportId: string, ai: NonNullable<Awaited<ReturnType<typeof prisma.aiReport.findUnique>>>): {
  status: ReturnType<typeof mapAiStatusToView>;
  result: AiAnalysisResult | null;
  error: string | null;
} {
  const st = mapAiStatusToView(ai.status);
  if (ai.status === "completed" && ai.sections) {
    const sections = ai.sections as unknown as AiAnalysisSection[];
    const result: AiAnalysisResult = {
      reportId,
      sections,
      summary: ai.summary ?? sections.at(-1)?.content ?? "",
      model: ai.model ?? "",
      tokensUsed: (ai.promptTokens ?? 0) + (ai.completionTokens ?? 0),
      status: "completed",
      generatedAt: ai.generatedAt?.toISOString() ?? null,
    };
    return { status: "completed", result, error: null };
  }
  return {
    status: st,
    result: null,
    error: ai.error ?? ai.failureReason,
  };
}

function validateAnswers(answers: QuizAnswerInput[]) {
  if (answers.length !== quizQuestions.length) {
    throw new Error("题目未答完");
  }

  const validIds = new Set(quizQuestions.map((question) => question.id));
  for (const answer of answers) {
    if (!validIds.has(answer.questionId)) {
      throw new Error("存在无效题目");
    }
    if (answer.value < 1 || answer.value > 5) {
      throw new Error("题目分值无效");
    }
  }
}

export async function createReportFromSubmission(input: CreateReportRequest, userId: string) {
  validateAnswers(input.answers);

  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    throw new Error("会话无效，请刷新页面后重试");
  }

  const mbti = scoreMbti(quizQuestions, input.answers);
  const sunSign = getSunSign(input.profile.birthDate);
  const report = buildCompatibilityReport(mbti.type, sunSign);
  const summary = buildReportSummary(input.profile, report);

  let slug = newReportSlug();
  for (let i = 0; i < 8; i++) {
    const exists = await prisma.report.findUnique({ where: { slug } });
    if (!exists) break;
    slug = newReportSlug();
  }

  const row = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        nickname: input.profile.nickname,
        gender: mapGender(input.profile.gender),
        birthDate: new Date(input.profile.birthDate),
        lastActiveAt: new Date(),
      },
    });

    const created = await tx.report.create({
      data: {
        slug,
        userId,
        status: "free_ready",
        summary,
        nickname: input.profile.nickname,
        mbtiType: report.mbtiType,
        sunSign: report.sunSign,
        loveStyleLabel: report.loveStyleLabel,
        bestMatch: report.bestMatch as object,
        topMatches: report.topMatches as object[],
        highRiskMatches: report.highRiskMatches as object[],
        strengths: report.strengths,
        conflicts: report.conflicts,
        advice: report.advice,
        isPremiumLocked: true,
        matchRank: report.matchRank,
        dimensionScores: mbti.dimensionScores as object,
      },
    });

    await tx.aiReport.create({
      data: {
        reportId: created.id,
        status: "not_started",
      },
    });

    return created;
  });

  return prismaReportToRecord(row);
}

export async function listReports() {
  try {
    const rows = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        nickname: true,
        mbtiType: true,
        sunSign: true,
        loveStyleLabel: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      nickname: r.nickname,
      mbtiType: r.mbtiType,
      sunSign: r.sunSign,
      loveStyleLabel: r.loveStyleLabel,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (e) {
    if (isUnavailableDatabaseError(e)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[db] listReports: 数据库不可用或未迁移，已返回空列表。请启动 PostgreSQL 并执行: npx prisma db push --config prisma.config.ts",
        );
      }
      return [];
    }
    throw e;
  }
}

export async function getReportRecord(reportId: string) {
  const r = await prisma.report.findFirst({
    where: { OR: [{ id: reportId }, { slug: reportId }] },
  });
  if (!r) return null;
  return prismaReportToRecord(r);
}

export async function getReportView(reportId: string): Promise<PaidReportView | null> {
  const r = await prisma.report.findFirst({
    where: { OR: [{ id: reportId }, { slug: reportId }] },
    include: {
      order: true,
      aiReport: true,
    },
  });
  if (!r) return null;

  const record = prismaReportToRecord(r);
  const order = r.order;
  const hasPaid = Boolean(order && order.status === "paid");

  const aiRow = r.aiReport;
  const aiMapped = aiRow
    ? prismaAiToResult(r.id, aiRow)
    : { status: "not_started" as const, result: null, error: null };

  const facet = r.facetResult ? (r.facetResult as unknown as FacetResult) : null;

  const fullRule = unlockReport(record);
  hydrateMatchDimensions(fullRule);
  const ruleReport = hasPaid ? fullRule : toLockedPublicReport(fullRule);

  let aiAnalysisStatus: PaidReportView["aiAnalysisStatus"];
  if (!hasPaid) {
    aiAnalysisStatus = "locked";
  } else {
    aiAnalysisStatus =
      aiMapped.status === "not_started"
        ? "not_started"
        : aiMapped.status === "processing"
          ? "processing"
          : aiMapped.status === "completed"
            ? "completed"
            : "failed";
  }

  return {
    ruleReport,
    hasPaid,
    aiAnalysisStatus,
    aiAnalysis: aiMapped.result,
    facetResult: facet,
  };
}

/** PRD 20.3：分享落地页仅展示免费级摘要，不暴露完整报告与 AI */
export async function getPublicShareView(reportKey: string) {
  const r = await prisma.report.findFirst({
    where: { OR: [{ id: reportKey }, { slug: reportKey }] },
  });
  if (!r) return null;

  const record = prismaReportToRecord(r);
  const full = unlockReport(record);
  hydrateMatchDimensions(full);
  const ruleReport = toLockedPublicReport(full);

  return {
    reportId: r.id,
    slug: r.slug,
    ruleReport,
  };
}

export async function markReportPaid(reportId: string) {
  const report = await prisma.report.findFirst({
    where: { OR: [{ id: reportId }, { slug: reportId }] },
  });
  if (!report) {
    throw new Error("报告不存在");
  }

  const resolvedId = report.id;

  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: resolvedId },
      data: { status: "paid_ready", isPremiumLocked: false },
    });

    const existing = await tx.order.findUnique({ where: { reportId: resolvedId } });
    const now = new Date();
    if (existing) {
      await tx.order.update({
        where: { reportId: resolvedId },
        data: {
          status: "paid",
          paidAt: now,
        },
      });
    } else {
      await tx.order.create({
        data: {
          reportId: resolvedId,
          amount: 990,
          currency: "CNY",
          paymentChannel: "mock",
          status: "paid",
          paidAt: now,
          expiredAt: new Date(now.getTime() + 15 * 60 * 1000),
        },
      });
    }

    await tx.aiReport.updateMany({
      where: { reportId: resolvedId, status: "failed" },
      data: { status: "not_started", error: null, failureReason: null },
    });
  });

  return getReportView(resolvedId);
}

const ORDER_TTL_MS = 15 * 60 * 1000;

export async function createPaymentIntent(
  reportKey: string,
  channel: "wechat_jsapi" | "wechat_h5" | "alipay_h5",
) {
  const report = await prisma.report.findFirst({
    where: { OR: [{ id: reportKey }, { slug: reportKey }] },
    include: { order: true },
  });
  if (!report) throw new Error("报告不存在");
  if (report.order?.status === "paid") {
    throw new Error("已支付");
  }

  const expiredAt = new Date(Date.now() + ORDER_TTL_MS);
  const existing = report.order;

  if (existing) {
    if (existing.status === "paid") {
      throw new Error("已支付");
    }
    if (existing.status === "expired" || existing.status === "failed") {
      return prisma.order.update({
        where: { id: existing.id },
        data: {
          status: "created",
          paymentChannel: channel,
          expiredAt,
          thirdPartyOrderId: null,
          paidAt: null,
        },
      });
    }
    return prisma.order.update({
      where: { id: existing.id },
      data: {
        paymentChannel: channel,
        expiredAt,
        status: existing.status === "created" ? "created" : existing.status,
      },
    });
  }

  return prisma.order.create({
    data: {
      reportId: report.id,
      amount: 990,
      currency: "CNY",
      paymentChannel: channel,
      status: "created",
      expiredAt,
    },
  });
}

export async function getPaymentOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { report: { select: { id: true, slug: true } } },
  });
}

/** 支付平台回调：验签通过后调用，将订单置为已付并解锁报告 */
export async function completeOrderPayment(orderId: string, thirdPartyOrderId?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new Error("订单不存在");
  }
  if (order.status === "paid") {
    return getReportView(order.reportId);
  }

  const reportId = order.reportId;
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "paid",
        paidAt: new Date(),
        ...(thirdPartyOrderId ? { thirdPartyOrderId } : {}),
      },
    });
    await tx.report.update({
      where: { id: reportId },
      data: { status: "paid_ready", isPremiumLocked: false },
    });
    await tx.aiReport.updateMany({
      where: { reportId, status: "failed" },
      data: { status: "not_started", error: null, failureReason: null },
    });
  });

  return getReportView(reportId);
}

function dimensionStrengthFromScores(scores: Record<string, number>) {
  const max = 18;
  const abs = (n: number) => Math.round((Math.abs(n) / max) * 100);
  return {
    ei: abs(scores.EI ?? 0),
    sn: abs(scores.SN ?? 0),
    tf: abs(scores.TF ?? 0),
    jp: abs(scores.JP ?? 0),
  };
}

export async function generateReportAi(reportId: string) {
  const r = await prisma.report.findFirst({
    where: { OR: [{ id: reportId }, { slug: reportId }] },
    include: { user: true, order: true, aiReport: true },
  });
  if (!r) {
    throw new Error("报告不存在");
  }
  if (r.status !== "paid_ready") {
    throw new Error("未解锁完整报告");
  }
  if (!r.order || r.order.status !== "paid") {
    throw new Error("未解锁完整报告");
  }

  const resolvedId = r.id;
  const ai = r.aiReport;
  if (!ai) {
    throw new Error("AI 状态丢失");
  }

  if (ai.status === "completed" && ai.sections) {
    return getReportView(resolvedId);
  }

  if (ai.status === "failed" && ai.retryCount >= 2) {
    throw new Error("AI 重试次数已达上限");
  }

  const record = prismaReportToRecord(r);
  const profile: UserProfileInput = {
    nickname: r.user.nickname,
    gender: r.user.gender === "female" ? "female" : "male",
    birthDate: r.user.birthDate.toISOString().slice(0, 10),
  };

  const dim = (r.dimensionScores as Record<string, number> | null) ?? {
    EI: 0,
    SN: 0,
    TF: 0,
    JP: 0,
  };
  const strengths = dimensionStrengthFromScores(dim);

  await prisma.aiReport.update({
    where: { reportId: resolvedId },
    data: { status: "processing", error: null },
  });

  try {
    const full = unlockReport(record);
    const analysis = await generateAiAnalysis(
      buildAiRequest(profile, record, resolvedId, strengths),
      full,
    );

    await prisma.aiReport.update({
      where: { reportId: resolvedId },
      data: {
        status: "completed",
        sections: analysis.sections as object[],
        summary: analysis.summary,
        model: analysis.model,
        promptTokens: Math.ceil(analysis.tokensUsed * 0.4),
        completionTokens: Math.ceil(analysis.tokensUsed * 0.6),
        generatedAt: new Date(),
        error: null,
        failureReason: null,
        retryCount: 0,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI 生成失败";
    await prisma.aiReport.update({
      where: { reportId: resolvedId },
      data: {
        status: "failed",
        error: msg,
        failureReason: msg,
        retryCount: { increment: 1 },
      },
    });
    throw error;
  }

  return getReportView(resolvedId);
}

export async function submitAdvancedQuiz(reportId: string, answers: QuizAnswerInput[]): Promise<FacetResult> {
  const report = await prisma.report.findFirst({
    where: { OR: [{ id: reportId }, { slug: reportId }] },
    include: { order: true },
  });
  if (!report) throw new Error("报告不存在");
  const paid = report.order?.status === "paid";
  if (!paid) throw new Error("请先解锁完整报告");
  if (report.status !== "paid_ready") throw new Error("未解锁完整报告");

  if (answers.length !== advancedQuestions.length) {
    throw new Error("进阶题目未答完");
  }
  const validIds = new Set(advancedQuestions.map((q) => q.id));
  for (const a of answers) {
    if (!validIds.has(a.questionId)) throw new Error("存在无效题目");
    if (a.value < 1 || a.value > 5) throw new Error("题目分值无效");
  }

  const scores = scoreFacets(advancedQuestions, answers);
  const result: FacetResult = {
    reportId: report.id,
    scores,
    completedAt: new Date().toISOString(),
  };

  await prisma.report.update({
    where: { id: report.id },
    data: { facetResult: result as object },
  });

  return result;
}

export async function clearAllReportData() {
  await prisma.shareEvent.deleteMany();
  await prisma.order.deleteMany();
  await prisma.aiReport.deleteMany();
  await prisma.report.deleteMany();
  await prisma.quizAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.user.deleteMany();
}
