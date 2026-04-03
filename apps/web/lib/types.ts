export type Gender = "male" | "female";

export type UserProfileInput = {
  nickname: string;
  gender: Gender;
  birthDate: string;
};

export type QuizAnswerInput = {
  questionId: string;
  value: number;
};

export type MbtiQuizSubmission = {
  attemptId: string;
  answers: QuizAnswerInput[];
};

export type MbtiDimensionKey = "EI" | "SN" | "TF" | "JP";

export type MbtiPole = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

export type MbtiQuestion = {
  id: string;
  index: number;
  dimension: MbtiDimensionKey;
  prompt: string;
  leftPole: MbtiPole;
  rightPole: MbtiPole;
  leftLabel: string;
  rightLabel: string;
};

export type MbtiResult = {
  type: string;
  dimensionScores: Record<MbtiDimensionKey, number>;
  tags: string[];
};

export type MatchDimension = {
  key: "chemistry" | "resonance" | "stability";
  label: string;
  score: number;
  tag: string;
};

export type MatchItem = {
  mbti: string;
  zodiac?: string;
  score: number;
  summary: string;
  dimensions?: MatchDimension[];
};

export type CompatibilityReport = {
  mbtiType: string;
  sunSign: string;
  loveStyleLabel: string;
  bestMatch: MatchItem;
  topMatches: MatchItem[];
  highRiskMatches: MatchItem[];
  strengths: string[];
  conflicts: string[];
  advice: string[];
  isPremiumLocked: boolean;
  matchRank: number;
};

// --------------- 进阶测试：Step II 子维度 ---------------

export type FacetKey =
  | "ei_initiative"
  | "ei_expression"
  | "ei_social"
  | "sn_concrete"
  | "sn_realistic"
  | "sn_experience"
  | "tf_empathy"
  | "tf_tolerance"
  | "tf_firmness"
  | "jp_planning"
  | "jp_decisiveness"
  | "jp_orderliness";

export type FacetQuestion = MbtiQuestion & {
  facet: FacetKey;
};

export type FacetScoreItem = {
  facet: FacetKey;
  dimension: MbtiDimensionKey;
  label: string;
  leftPoleLabel: string;
  rightPoleLabel: string;
  score: number;
  pole: string;
};

export type FacetResult = {
  reportId: string;
  scores: FacetScoreItem[];
  completedAt: string;
};

// --------------- AI ---------------

export type AiTonePreset = "sharp" | "warm" | "direct";

export type AiAnalysisRequest = {
  reportId: string;
  userProfileSummary: string;
  compatibilitySummary: string;
  tonePreset: AiTonePreset;
  language: "zh-CN";
};

export type AiAnalysisSection = {
  key: string;
  title: string;
  content: string;
};

export type AiAnalysisResult = {
  reportId: string;
  sections: AiAnalysisSection[];
  summary: string;
  model: string;
  tokensUsed: number;
  status: "pending" | "completed" | "failed";
  generatedAt: string | null;
};

export type PaidReportView = {
  ruleReport: CompatibilityReport;
  /** 已核销支付订单，可查看完整规则报告（PRD 9.6） */
  hasPaid: boolean;
  aiAnalysisStatus:
    | "locked"
    | "not_started"
    | "processing"
    | "completed"
    | "failed";
  aiAnalysis: AiAnalysisResult | null;
  facetResult: FacetResult | null;
};

export type CreateReportRequest = {
  profile: UserProfileInput;
  answers: QuizAnswerInput[];
};

export type ReportRecord = CompatibilityReport & {
  id: string;
  /** 公开分享用短链，不等于 userId（PRD 9.10） */
  slug: string;
  profileId: string;
  status: "draft" | "free_ready" | "paid_ready";
  summary: string;
  createdAt: string;
  nickname: string;
};

