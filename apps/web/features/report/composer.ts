import type {
  CompatibilityReport,
  ReportRecord,
  UserProfileInput,
} from "@/lib/types";

export function composeFreePreview(report: CompatibilityReport) {
  return {
    headline: `${report.mbtiType} / ${report.sunSign}`,
    label: report.loveStyleLabel,
    bestMatch: report.bestMatch,
    advice: report.advice.slice(0, 2),
  };
}

export function buildReportSummary(profile: UserProfileInput, report: CompatibilityReport) {
  return `${profile.nickname} 的结果显示为 ${report.mbtiType} / ${report.sunSign}，最容易被 ${report.bestMatch.mbti} + ${report.bestMatch.zodiac} 型对象吸引。`;
}

export function unlockReport(report: CompatibilityReport): CompatibilityReport {
  return {
    ...report,
    isPremiumLocked: false,
  };
}

/** PRD 9.5：免费基础结果可展示字段；完整灵魂伴侣报告模块在付费后通过 unlockReport 释放 */
export function toLockedPublicReport(report: CompatibilityReport): CompatibilityReport {
  return {
    ...report,
    isPremiumLocked: true,
    topMatches: [],
    highRiskMatches: [],
    strengths: [],
    conflicts: [],
    advice: report.advice.slice(0, 2),
    bestMatch: {
      ...report.bestMatch,
      dimensions: undefined,
    },
  };
}

export function toReportRecord(
  id: string,
  slug: string,
  profileId: string,
  nickname: string,
  status: ReportRecord["status"],
  summary: string,
  report: CompatibilityReport,
  createdAt: Date,
): ReportRecord {
  return {
    id,
    slug,
    profileId,
    status,
    summary,
    nickname,
    createdAt: createdAt.toISOString(),
    ...report,
  };
}

