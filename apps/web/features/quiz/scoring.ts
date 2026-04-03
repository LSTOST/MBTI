import { clamp } from "@/lib/utils";
import type {
  FacetKey,
  FacetQuestion,
  FacetScoreItem,
  MbtiDimensionKey,
  MbtiQuestion,
  MbtiResult,
  QuizAnswerInput,
} from "@/lib/types";
import { FACET_META } from "@/features/quiz/advanced-questions";

const dimensionOrder: MbtiDimensionKey[] = ["EI", "SN", "TF", "JP"];

const tieBreakers: Record<MbtiDimensionKey, string> = {
  EI: "I",
  SN: "N",
  TF: "F",
  JP: "J",
};

export function scoreMbti(
  questions: MbtiQuestion[],
  answers: QuizAnswerInput[],
): MbtiResult {
  const scoreMap: Record<MbtiDimensionKey, number> = {
    EI: 0,
    SN: 0,
    TF: 0,
    JP: 0,
  };

  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.value]));

  for (const question of questions) {
    const raw = answerMap.get(question.id) ?? 3;
    const normalized = clamp(raw, 1, 5) - 3;
    scoreMap[question.dimension] += normalized;
  }

  const type = dimensionOrder
    .map((dimension) => {
      const questionsInDimension = questions.filter((item) => item.dimension === dimension);
      const sample = questionsInDimension[0];
      if (!sample) {
        return tieBreakers[dimension];
      }
      const score = scoreMap[dimension];
      if (score === 0) {
        return tieBreakers[dimension];
      }
      return score > 0 ? sample.rightPole : sample.leftPole;
    })
    .join("");

  return {
    type,
    dimensionScores: scoreMap,
    tags: buildMbtiTags(type),
  };
}

export function scoreFacets(
  questions: FacetQuestion[],
  answers: QuizAnswerInput[],
): FacetScoreItem[] {
  const scoreMap = new Map<FacetKey, number>();
  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]));

  for (const q of questions) {
    const raw = answerMap.get(q.id) ?? 3;
    const normalized = clamp(raw, 1, 5) - 3;
    scoreMap.set(q.facet, (scoreMap.get(q.facet) ?? 0) + normalized);
  }

  const results: FacetScoreItem[] = [];
  for (const [facet, score] of scoreMap) {
    const meta = FACET_META[facet];
    const pole =
      score === 0
        ? meta.rightPoleLabel
        : score > 0
          ? meta.rightPoleLabel
          : meta.leftPoleLabel;

    results.push({
      facet,
      dimension: meta.dimension,
      label: meta.label,
      leftPoleLabel: meta.leftPoleLabel,
      rightPoleLabel: meta.rightPoleLabel,
      score,
      pole,
    });
  }

  return results;
}

export function buildMbtiTags(type: string) {
  const tags: string[] = [];

  if (type.includes("N")) tags.push("容易对感觉和可能性上头");
  else tags.push("更在意对方是否真实可靠");

  if (type.includes("F")) tags.push("在关系里需要被理解和接住");
  else tags.push("在关系里更依赖理性和边界");

  if (type.includes("J")) tags.push("喜欢知道关系正在往哪走");
  else tags.push("需要保留一点呼吸感和空间");

  return tags;
}

