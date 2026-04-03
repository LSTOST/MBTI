import type { CompatibilityReport, MatchDimension, MatchItem } from "@/lib/types";

const mbtiTypes = [
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
] as const;

const zodiacSigns = [
  "白羊座",
  "金牛座",
  "双子座",
  "巨蟹座",
  "狮子座",
  "处女座",
  "天秤座",
  "天蝎座",
  "射手座",
  "摩羯座",
  "水瓶座",
  "双鱼座",
] as const;

/** MBTI × 星座 全量配对数量，与老数据缺字段时的兜底一致 */
export const TOTAL_COMPATIBILITY_COMBINATIONS = mbtiTypes.length * zodiacSigns.length;

const idealMbtiPairs: Record<string, string[]> = {
  INTJ: ["ENFP", "ENTP"],
  INTP: ["ENTJ", "ENFJ"],
  ENTJ: ["INTP", "INFP"],
  ENTP: ["INFJ", "INTJ"],
  INFJ: ["ENFP", "ENTP"],
  INFP: ["ENFJ", "ENTJ"],
  ENFJ: ["INFP", "ISFP"],
  ENFP: ["INFJ", "INTJ"],
  ISTJ: ["ESFP", "ESTP"],
  ISFJ: ["ESFP", "ESTP"],
  ESTJ: ["ISFP", "ISTP"],
  ESFJ: ["ISFP", "ISTP"],
  ISTP: ["ESFJ", "ESTJ"],
  ISFP: ["ENFJ", "ESFJ"],
  ESTP: ["ISFJ", "ISTJ"],
  ESFP: ["ISFJ", "ISTJ"],
};

const zodiacMeta: Record<
  string,
  { element: "fire" | "earth" | "air" | "water"; vibe: string }
> = {
  白羊座: { element: "fire", vibe: "热得快、冲得快" },
  金牛座: { element: "earth", vibe: "慢热但稳定" },
  双子座: { element: "air", vibe: "轻快、会聊、反应快" },
  巨蟹座: { element: "water", vibe: "敏感、顾家、情绪浓" },
  狮子座: { element: "fire", vibe: "自带存在感和热度" },
  处女座: { element: "earth", vibe: "细节感强，标准清楚" },
  天秤座: { element: "air", vibe: "会拿捏相处氛围" },
  天蝎座: { element: "water", vibe: "深、狠、占有欲强" },
  射手座: { element: "fire", vibe: "自由感强，讨厌被闷住" },
  摩羯座: { element: "earth", vibe: "现实克制，长期主义" },
  水瓶座: { element: "air", vibe: "独特、跳脱、需要空间" },
  双鱼座: { element: "water", vibe: "浪漫、柔软、代入感强" },
};

const elementSynergy: Record<string, number> = {
  "fire:air": 24,
  "air:fire": 24,
  "earth:water": 24,
  "water:earth": 24,
  "fire:fire": 18,
  "air:air": 18,
  "earth:earth": 16,
  "water:water": 16,
  "fire:water": 6,
  "water:fire": 6,
  "air:earth": 8,
  "earth:air": 8,
};

function scoreMbtiPair(source: string, target: string) {
  let score = 55;

  const pairs = [
    [source[0], target[0], true],
    [source[1], target[1], false],
    [source[2], target[2], false],
    [source[3], target[3], true],
  ] as const;

  for (const [sourceChar, targetChar, preferOpposite] of pairs) {
    if (sourceChar === targetChar) {
      score += preferOpposite ? 4 : 8;
    } else {
      score += preferOpposite ? 8 : 4;
    }
  }

  if (idealMbtiPairs[source]?.includes(target)) {
    score += 12;
  }

  if (source[1] !== target[1] && source[2] !== target[2]) {
    score -= 6;
  }

  return Math.max(5, Math.min(98, score));
}

function scoreZodiacPair(source: string, target: string) {
  const sourceMeta = zodiacMeta[source];
  const targetMeta = zodiacMeta[target];
  const pairKey = `${sourceMeta.element}:${targetMeta.element}`;

  let score = 52 + (elementSynergy[pairKey] ?? 10);

  if (source === target) {
    score += 8;
  }

  return Math.max(5, Math.min(96, score));
}

function buildSummary(sourceMbti: string, sourceSign: string, targetMbti: string, targetSign: string) {
  return `${sourceMbti} 容易被 ${targetMbti} 的节奏感和 ${targetSign} 那种 ${zodiacMeta[targetSign].vibe} 的关系氛围吸住，但真正稳定的关键，是对方既能给回应，也不会压缩你的表达空间。`;
}

function buildLoveStyleLabel(mbtiType: string, sunSign: string) {
  const group =
    mbtiType.includes("NF") ? "共鸣型恋人" :
    mbtiType.includes("NT") ? "脑力拉扯型恋人" :
    mbtiType.includes("SJ") ? "稳定经营型恋人" :
    "感官火花型恋人";

  return `${sunSign}${group}`;
}

function computeMatchDimensions(
  sourceMbti: string,
  sourceSign: string,
  targetMbti: string,
  targetSign: string,
): MatchDimension[] {
  const mbtiRaw = scoreMbtiPair(sourceMbti, targetMbti);
  const zodiacRaw = scoreZodiacPair(sourceSign, targetSign);

  const chemistryTag =
    mbtiRaw >= 85 ? "很容易来电" : mbtiRaw >= 70 ? "互相有吸引力" : "好感要慢慢养";
  const resonanceTag =
    zodiacRaw >= 80 ? "相处不怎么累" : zodiacRaw >= 65 ? "偶尔会别扭" : "得多互相适应";

  let stabilityScore = 50;
  if (sourceMbti[3] === targetMbti[3]) stabilityScore += 12;
  if (sourceMbti[1] === targetMbti[1]) stabilityScore += 10;
  const sourceEl = zodiacMeta[sourceSign]?.element;
  const targetEl = zodiacMeta[targetSign]?.element;
  if (sourceEl === "earth" || targetEl === "earth") stabilityScore += 8;
  if (sourceEl === targetEl) stabilityScore += 6;
  stabilityScore = Math.max(5, Math.min(98, stabilityScore));

  const stabilityTag =
    stabilityScore >= 80 ? "适合长期在一起" : stabilityScore >= 65 ? "能处得下去" : "分歧会比较多";

  return [
    { key: "chemistry", label: "性格合拍", score: mbtiRaw, tag: chemistryTag },
    { key: "resonance", label: "星座相处", score: zodiacRaw, tag: resonanceTag },
    { key: "stability", label: "长久相处", score: stabilityScore, tag: stabilityTag },
  ];
}

/** 在已按 score 降序排好的列表里，取前 n 个「目标 MBTI 不重复」的项（每种人格保留分最高的一条） */
function pickTopDistinctTargetMbti(sortedHighToLow: MatchItem[], limit: number): MatchItem[] {
  const out: MatchItem[] = [];
  const seen = new Set<string>();
  for (const row of sortedHighToLow) {
    if (seen.has(row.mbti)) continue;
    seen.add(row.mbti);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

/** 从最低分段开始，取 n 个目标 MBTI 不重复的项 */
function pickBottomDistinctTargetMbti(sortedHighToLow: MatchItem[], limit: number): MatchItem[] {
  const out: MatchItem[] = [];
  const seen = new Set<string>();
  for (let i = sortedHighToLow.length - 1; i >= 0 && out.length < limit; i--) {
    const row = sortedHighToLow[i];
    if (seen.has(row.mbti)) continue;
    seen.add(row.mbti);
    out.push(row);
  }
  return out;
}

export function hydrateMatchDimensions(report: CompatibilityReport) {
  if (
    typeof report.matchRank !== "number" ||
    !Number.isFinite(report.matchRank) ||
    report.matchRank < 1
  ) {
    report.matchRank = TOTAL_COMPATIBILITY_COMBINATIONS;
  }

  if (!report.bestMatch.dimensions) {
    report.bestMatch.dimensions = computeMatchDimensions(
      report.mbtiType, report.sunSign, report.bestMatch.mbti, report.bestMatch.zodiac!,
    );
  }
  for (const m of report.topMatches) {
    if (!m.dimensions && m.zodiac) {
      m.dimensions = computeMatchDimensions(report.mbtiType, report.sunSign, m.mbti, m.zodiac);
    }
  }
  for (const m of report.highRiskMatches) {
    if (!m.dimensions && m.zodiac) {
      m.dimensions = computeMatchDimensions(report.mbtiType, report.sunSign, m.mbti, m.zodiac);
    }
  }
}

export function buildCompatibilityReport(mbtiType: string, sunSign: string): CompatibilityReport {
  const combinedMatches: MatchItem[] = [];

  for (const targetMbti of mbtiTypes) {
    for (const targetSign of zodiacSigns) {
      const mbtiScore = scoreMbtiPair(mbtiType, targetMbti);
      const zodiacScore = scoreZodiacPair(sunSign, targetSign);
      // 保留一位小数再排序/展示，避免大量组合四舍五入到同一整数导致 Top3、Bottom3 分数雷同
      const score = Math.round((mbtiScore * 0.65 + zodiacScore * 0.35) * 10) / 10;

      combinedMatches.push({
        mbti: targetMbti,
        zodiac: targetSign,
        score,
        summary: buildSummary(mbtiType, sunSign, targetMbti, targetSign),
      });
    }
  }

  combinedMatches.sort((left, right) => right.score - left.score);

  const topMatches = pickTopDistinctTargetMbti(combinedMatches, 3);
  const highRiskMatches = pickBottomDistinctTargetMbti(combinedMatches, 3);

  const totalCombinations = combinedMatches.length;
  for (const m of topMatches) {
    m.dimensions = computeMatchDimensions(mbtiType, sunSign, m.mbti, m.zodiac!);
  }
  for (const m of highRiskMatches) {
    m.dimensions = computeMatchDimensions(mbtiType, sunSign, m.mbti, m.zodiac!);
  }

  const strengths = [
    `${mbtiType} 的你在关系里不缺判断力，知道什么会让你上头，也知道什么会让你消耗。`,
    `${sunSign} 让你在亲密关系里自带明显气场，很容易让别人迅速记住你的情绪温度。`,
    "当你确认一个人值得投入时，你的稳定度和持续投入能力其实比外界想象得更强。",
  ];

  const conflicts = [
    "你容易被高张力的人吸引，但高张力和高稳定经常不是一回事。",
    "如果对方回应模糊、节奏失衡，你会迅速从心动滑进内耗。",
    "你并不怕爱得深，怕的是关系没有方向却还要你一直扛情绪。",
  ];

  const advice = [
    "先看对方是否持续回应，再决定要不要继续加码投入。",
    "不要只因为聊天有感觉就默认对方有长期能力，行动密度比情绪密度重要。",
    "当你开始猜、开始补、开始替对方解释时，基本就是该踩刹车的时候。",
  ];

  return {
    mbtiType,
    sunSign,
    loveStyleLabel: buildLoveStyleLabel(mbtiType, sunSign),
    bestMatch: combinedMatches[0],
    topMatches,
    highRiskMatches,
    strengths,
    conflicts,
    advice,
    isPremiumLocked: false,
    matchRank: totalCombinations,
  };
}

