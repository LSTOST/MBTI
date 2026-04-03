import type { FacetKey, FacetQuestion, MbtiDimensionKey, MbtiPole } from "@/lib/types";

function buildFacetQuestions(
  dimension: MbtiDimensionKey,
  leftPole: MbtiPole,
  rightPole: MbtiPole,
  rows: Array<[FacetKey, string, string, string]>,
  startIndex: number,
): FacetQuestion[] {
  return rows.map(([facet, prompt, leftLabel, rightLabel], offset) => ({
    id: `ADV-${dimension}-${offset + 1}`,
    index: startIndex + offset,
    dimension,
    prompt,
    leftPole,
    rightPole,
    leftLabel,
    rightLabel,
    facet,
  }));
}

// ── EI 子维度 ──────────────────────────────────────────
// ei_initiative  主动/被动（社交发起）
// ei_expression  表达/内敛（情感表露）
// ei_social      合群/独处（充电方式）

const eiAdvanced = buildFacetQuestions(
  "EI", "E", "I",
  [
    [
      "ei_initiative",
      "在关系里，你很少会第一个发起联系或约对方。",
      "我经常主动联系",
      "我很少主动联系",
    ],
    [
      "ei_initiative",
      "认识新朋友时，你更习惯等别人来找你聊，而不是自己凑上去。",
      "我会主动去搭话",
      "我等别人来找我",
    ],
    [
      "ei_expression",
      "即使心里很在意一个人，你也不太会直接表达出来。",
      "我会直接表达感情",
      "我倾向于藏在心里",
    ],
    [
      "ei_expression",
      "比起口头说「我喜欢你」，你更习惯用行动来表达感情。",
      "我擅长语言表达感情",
      "我更擅长用行动表达",
    ],
    [
      "ei_social",
      "连续几天高密度社交后，你会特别渴望一个人待着。",
      "社交越多越兴奋",
      "社交后需要独处充电",
    ],
    [
      "ei_social",
      "你更享受和一两个亲近的人深聊，而不是在大群里热闹。",
      "我喜欢多人热闹",
      "我喜欢少数人深聊",
    ],
  ],
  1,
);

// ── SN 子维度 ──────────────────────────────────────────
// sn_concrete    具体/抽象（沟通方式）
// sn_realistic   现实/想象（择偶标准）
// sn_experience  经验/直觉（决策依据）

const snAdvanced = buildFacetQuestions(
  "SN", "S", "N",
  [
    [
      "sn_concrete",
      "聊天时你更喜欢讨论可能性和假设，而不是具体发生过的事。",
      "我更喜欢聊具体的事",
      "我更喜欢聊想法和可能",
    ],
    [
      "sn_concrete",
      "你经常觉得别人说话太具体了，缺少一些想象空间。",
      "我觉得具体点更好",
      "我觉得要有想象空间",
    ],
    [
      "sn_realistic",
      "选择伴侣时，精神上的契合比物质条件更让你心动。",
      "现实条件更重要",
      "精神契合更重要",
    ],
    [
      "sn_realistic",
      "你容易被对方描绘的未来愿景吸引，即使当下条件并不完美。",
      "我更看重当下现实",
      "我更看重未来可能",
    ],
    [
      "sn_experience",
      "面对从没遇到过的关系问题，你更相信直觉而不是找过来人的经验。",
      "我会参考他人经验",
      "我更相信自己的直觉",
    ],
    [
      "sn_experience",
      "做关于感情的重要决定时，你常常「就是觉得对」，说不出具体理由。",
      "我能说出具体理由",
      "我经常凭感觉决定",
    ],
  ],
  7,
);

// ── TF 子维度 ──────────────────────────────────────────
// tf_empathy     逻辑/共情（冲突处理）
// tf_tolerance   质疑/包容（容忍度）
// tf_firmness    坚定/柔和（表达风格）

const tfAdvanced = buildFacetQuestions(
  "TF", "T", "F",
  [
    [
      "tf_empathy",
      "看到别人难过时，你会不由自主地感受到对方的情绪。",
      "我能保持客观距离",
      "我很容易被对方情绪感染",
    ],
    [
      "tf_empathy",
      "吵架后你更想先确认对方的心情，而不是复盘谁说错了什么。",
      "我想先复盘对错",
      "我想先确认对方心情",
    ],
    [
      "tf_tolerance",
      "朋友做了你不认同的选择时，你更倾向于尊重而不是指出问题。",
      "我会直接指出问题",
      "我倾向于尊重对方选择",
    ],
    [
      "tf_tolerance",
      "在关系里你很少会直接否定对方的想法，即使你内心不同意。",
      "我会直接表达反对",
      "我不太会当面否定",
    ],
    [
      "tf_firmness",
      "表达观点时，你更在意措辞是否温和，而不是是否精准。",
      "我更追求表达精准",
      "我更追求措辞温和",
    ],
    [
      "tf_firmness",
      "提需求时，你习惯用商量的语气，而不是直接提要求。",
      "我会直接说需求",
      "我习惯用商量的语气",
    ],
  ],
  13,
);

// ── JP 子维度 ──────────────────────────────────────────
// jp_planning      计划/开放（约会风格）
// jp_decisiveness  早决/晚决（关系节奏）
// jp_orderliness   有序/灵活（生活习惯）

const jpAdvanced = buildFacetQuestions(
  "JP", "J", "P",
  [
    [
      "jp_planning",
      "约会时你更享受随机游走的惊喜，而不是按计划执行。",
      "我喜欢按计划进行",
      "我喜欢随机探索",
    ],
    [
      "jp_planning",
      "对于周末怎么过，你更喜欢走一步看一步，而不是提前安排好。",
      "我会提前安排好",
      "我喜欢走一步看一步",
    ],
    [
      "jp_decisiveness",
      "暧昧期你觉得顺其自然比着急确认关系更舒服。",
      "我想尽快确认关系",
      "我觉得顺其自然更好",
    ],
    [
      "jp_decisiveness",
      "面对需要做决定的事情，你经常拖到最后一刻才定下来。",
      "我倾向尽早做决定",
      "我习惯最后再定",
    ],
    [
      "jp_orderliness",
      "你的生活节奏比较随性，不太喜欢固定的日程表。",
      "我喜欢有条理的日程",
      "我喜欢随性的节奏",
    ],
    [
      "jp_orderliness",
      "和伴侣的生活里，你更需要灵活弹性，而不是固定分工和习惯。",
      "我喜欢固定分工",
      "我喜欢灵活弹性",
    ],
  ],
  19,
);

export const advancedQuestions: FacetQuestion[] = [
  ...eiAdvanced,
  ...snAdvanced,
  ...tfAdvanced,
  ...jpAdvanced,
];

export const FACET_META: Record<FacetKey, { dimension: MbtiDimensionKey; label: string; leftPoleLabel: string; rightPoleLabel: string }> = {
  ei_initiative:    { dimension: "EI", label: "社交发起", leftPoleLabel: "主动型", rightPoleLabel: "被动型" },
  ei_expression:    { dimension: "EI", label: "情感表露", leftPoleLabel: "外显型", rightPoleLabel: "内敛型" },
  ei_social:        { dimension: "EI", label: "充电方式", leftPoleLabel: "群体充电", rightPoleLabel: "独处充电" },
  sn_concrete:      { dimension: "SN", label: "沟通偏好", leftPoleLabel: "具体型", rightPoleLabel: "抽象型" },
  sn_realistic:     { dimension: "SN", label: "择偶视角", leftPoleLabel: "现实型", rightPoleLabel: "理想型" },
  sn_experience:    { dimension: "SN", label: "决策依据", leftPoleLabel: "经验型", rightPoleLabel: "直觉型" },
  tf_empathy:       { dimension: "TF", label: "冲突处理", leftPoleLabel: "逻辑型", rightPoleLabel: "共情型" },
  tf_tolerance:     { dimension: "TF", label: "包容度",   leftPoleLabel: "质疑型", rightPoleLabel: "包容型" },
  tf_firmness:      { dimension: "TF", label: "表达风格", leftPoleLabel: "坚定型", rightPoleLabel: "柔和型" },
  jp_planning:      { dimension: "JP", label: "约会风格", leftPoleLabel: "计划型", rightPoleLabel: "随性型" },
  jp_decisiveness:  { dimension: "JP", label: "决策节奏", leftPoleLabel: "早决型", rightPoleLabel: "晚决型" },
  jp_orderliness:   { dimension: "JP", label: "生活节奏", leftPoleLabel: "有序型", rightPoleLabel: "灵活型" },
};
