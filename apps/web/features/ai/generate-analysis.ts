import OpenAI from "openai";

import { getEnv } from "@/lib/env";
import type {
  AiAnalysisRequest,
  AiAnalysisResult,
  AiAnalysisSection,
  CompatibilityReport,
} from "@/lib/types";

const MAX_OUTPUT_TOKENS = 12_000;
const MAX_AI_ATTEMPTS = 3;

/** OpenRouter 的 key 形如 sk-or-v1-…，若误填进 OPENAI_API_KEY 会打到 OpenAI 官方并报 401 */
function isLikelyOpenRouterApiKey(key: string): boolean {
  const t = key.trim();
  return t.startsWith("sk-or-v1") || t.startsWith("sk-or-");
}

function resolveAiProviderKeys(env: ReturnType<typeof getEnv>): {
  openRouterKey: string | undefined;
  openAiKey: string | undefined;
} {
  let openRouterKey = env.openRouterApiKey?.trim() || undefined;
  let openAiKey = env.openAiApiKey?.trim() || undefined;
  if (!openRouterKey && openAiKey && isLikelyOpenRouterApiKey(openAiKey)) {
    openRouterKey = openAiKey;
    openAiKey = undefined;
  }
  return { openRouterKey, openAiKey };
}

/** 输出顺序与 key 固定，便于解析与 PDF */
const SECTION_BLUEPRINT: { key: string; title: string }[] = [
  { key: "driver", title: "你的灵魂伴侣核心驱动力" },
  { key: "hidden-needs", title: "你在关系中的隐藏需求" },
  { key: "attraction", title: "你为什么容易被某类人吸引" },
  { key: "pitfall", title: "你在暧昧期最容易踩的坑" },
  { key: "pace", title: "适合你的关系推进节奏" },
  { key: "week-vignette", title: "和对方相处的「一周缩影」" },
  { key: "conflict-rehearsal", title: "高频冲突预演" },
  { key: "dont-list", title: "关系里暂时不要做什么" },
  { key: "micro-actions", title: "30 天微行动建议" },
  { key: "summary", title: "私人顾问式总结" },
];

function buildFallbackSections(report: CompatibilityReport): AiAnalysisSection[] {
  const bm = report.bestMatch;
  return SECTION_BLUEPRINT.map(({ key, title }, i) => {
    if (key === "driver") {
      return {
        key,
        title,
        content: `你不是随便心动的人，但一旦出现 ${bm.mbti} 这种能接住你节奏的人，你会迅速把「好感」升级成「想认真看看」。你真正要的不是热闹，是又有感觉又有回应。`,
        bullets: ["要的是「被接住」，不是单方面表演", "节奏感对上了，你才会愿意往前迈一步"],
        example: `对方：「我懂你为什么卡住，我们按你的节奏来。」`,
      };
    }
    if (key === "hidden-needs") {
      return {
        key,
        title,
        content: `表面上你能扛、能判断，实际上你很需要对方给出稳定而明确的反馈。你会用对方的行动频率，默默判断自己值不值得继续投入。`,
        bullets: ["需要「可预期的回应」，讨厌长期悬着", "嘴上不说，但心里在记账"],
        example: `你：「这周你哪天方便？我想见你。」对方给具体时间，比「再说吧」更让你安心。`,
      };
    }
    if (key === "attraction") {
      return {
        key,
        title,
        content: `${bm.zodiac ?? ""} 的氛围感与 ${bm.mbti} 的表达方式，容易打中你对「有人懂我、又能带动关系往前走」的期待。`,
        bullets: ["被「懂 + 推进」同时满足时，吸引力会飙升", "只有暧昧没有确认，你会很快下头"],
        example: "",
      };
    }
    if (key === "pitfall") {
      return {
        key,
        title,
        content: `你容易在感觉刚对上的时候替关系加戏。对方回应一模糊，你就在「再等等」和「是不是我想多了」之间内耗。`,
        bullets: ["把对方的礼貌当信号", "用想象填补对方的沉默"],
        example: "",
      };
    }
    if (key === "pace") {
      return {
        key,
        title,
        content: `前期要有明显回应，中期有稳定频率，后期能自然确认关系。节奏长期失衡，就不值得你继续赌。`,
        bullets: ["宁可慢一点，也不要一直猜", "连续三次「下次再说」要警惕"],
        example: "",
      };
    }
    if (key === "week-vignette") {
      return {
        key,
        title,
        content: `以下为类型化相处节奏示例（非具体真人）：`,
        bullets: [
          "周一：简短问候 + 一件具体小事开场",
          "周二：对方主动分享日常，你回应感受而非评判",
          "周三：约定一次低压力见面或语音",
          "周四：出现小误会时，先对齐事实再谈情绪",
          "周五：给彼此一点空白，不查岗式追问",
          "周末：一起做一件轻松的事，顺便聊对未来的期待",
          "周日：复盘「这周哪里舒服 / 哪里别扭」",
        ],
        example: "",
      };
    }
    if (key === "conflict-rehearsal") {
      return {
        key,
        title,
        content: `当报告里提到的高频冲突被触及时，你容易先内化；对方若偏理性或回避，会放大你的不安。`,
        bullets: [
          "触发：回复变慢、临时取消、态度变冷",
          "你容易想：「是不是我不够好 / 对方下头了」",
          "对方可能想：「我在忙 / 我需要空间」",
          "更稳的回应：先陈述事实与感受，再要一个具体时间点的下一步",
        ],
        example: `「我知道你最近忙，我会给你空间。但我需要知道我们下次沟通大概什么时候，不然我会乱想。」`,
      };
    }
    if (key === "dont-list") {
      return {
        key,
        title,
        content: `在关系尚未稳定确认前，以下行为容易让你更累：`,
        bullets: [
          "用沉默惩罚对方，同时期待对方猜中",
          "把社交平台的蛛丝马迹当判决书",
          "为迎合对方长期压抑自己的底线",
          "在没对齐期待前就过度投入物质或承诺",
        ],
        example: "",
      };
    }
    if (key === "micro-actions") {
      return {
        key,
        title,
        content: `不必一次做完，选 3～5 条坚持即可：`,
        bullets: [
          "每周一次：用一句话说出「我需要什么」而非「你为什么这样」",
          "感到不安时：先写下来，隔 6 小时再决定是否发长文",
          "约会前：各自说一个「今天想聊 / 不想聊」的边界",
          "冲突后：24 小时内做一次简短复盘",
          "每月：检查自己是否还在「被尊重、被看见」",
        ],
        example: "",
      };
    }
    return {
      key,
      title,
      content: `你适合的关系，不是让你一直猜，而是让你越来越笃定。真正对的人，会同时给你情绪共鸣与现实推进。`,
      bullets: i === 9 ? ["笃定来自「说得清 + 做得到」", "一半共鸣一半悬着，迟早会耗尽你"] : [],
      example: "",
    };
  });
}

function buildSystemPrompt(): string {
  return [
    "你是一位专业的亲密关系分析师，基于用户的人格与灵魂伴侣测评报告生成「灵魂伴侣向」深度解读。",
    "风格：犀利、具体、有洞察力；像认识用户很久的朋友；拒绝空泛鸡汤与伪科学权威表述。",
    "边界：只使用用户提供的结构化数据；不读取、不推测原始逐题答案；不承诺科学准确或保证找到真爱。",
    "必须与灵魂伴侣报告中的优势、冲突、建议、匹配对象保持一致，可深化阐释，不可自相矛盾。",
    "篇幅（默认）：除下列两节外，每个模块正文 content 至少约 220～380 汉字，写成 2～3 个自然段（用 \\n\\n 分段）；禁止一句话敷衍。",
    "要点（默认）：除下列两节外，每个模块必须包含 bullets 数组 3～5 条短句（每条不超过 40 字）。",
    "除「一周缩影」「30 天微行动」与「私人顾问式总结」外，每个模块尽量提供 example：一条可直接改口使用的沟通示例（单独一段对话或一句表态，50～120 字）；若无合适场景可给空字符串。",
    "【一周缩影 week-vignette】正文 content：只允许 1～2 个短段，合计约 80～200 字，只写「为什么要按天观察」「这一周要留意什么关系信号」，必须与灵魂伴侣报告结论呼应。严禁在 content 里再写周一至周日的具体安排，严禁与 bullets 重复同义句。",
    "【一周缩影】bullets：必须恰好 7 条，依次以「周一」…「周日」开头，每条一句当天可感知的小场景（只出现在 bullets）。",
    "【30 天微行动 micro-actions】正文 content：只允许 1 个短段，约 80～180 字，只写「30 天里如何选做、叠加节奏、失败时怎么降档」等用法说明。严禁在 content 里逐条罗列行动清单，严禁与 bullets 重复。",
    "【30 天微行动】bullets：7～10 条可执行短句，侧重跨周习惯与可复用句式（如固定复盘、边界表达、感谢/请求模板、观察伴侣情绪的微步骤），不要写成「周一到周日」的日程表。",
    "【去重】「30 天微行动」的 bullets 禁止与「一周缩影」7 条在主题上大面积雷同：一周缩影是「单日相处画面」，30 天微行动是「可持续微习惯与沟通机制」；若某条与一周某天的内容仅换表述，必须删掉改写为不同维度。",
    "【关系禁区 dont-list】必须结合该用户的画像、暧昧/冲突风险与灵魂伴侣报告中的冲突、建议，写出只属于 TA 的「现阶段少做清单」，禁止套用泛泛的恋爱常识套话；content 至少约 220～380 汉字（2～3 段，用 \\n\\n 分段）；bullets 必须 3～5 条，每条一条具体可识别的行为禁区；key 必须为 dont-list；example 若无合适场景可空字符串。",
    "「私人顾问式总结」模块：content 写收束全文；bullets 可 2～4 条金句式提醒，或空数组；example 可空字符串。",
    "输出：仅输出一个 JSON 对象，不要 Markdown 代码围栏，不要前后解释。",
    "JSON 结构：",
    '{ "summary": "开篇总述 2～4 句，用于页顶摘要", "sections": [',
    '{ "key": "driver", "title": "可省略则留空字符串用默认", "content": "…", "bullets": ["…"], "example": "…" },',
    "… 共 10 个对象，key 须依次为（必须全小写、用英文连字符 -，禁止下划线或小驼峰）：driver, hidden-needs, attraction, pitfall, pace, week-vignette, conflict-rehearsal, dont-list, micro-actions, summary",
    "] }",
  ].join("\n");
}

/** 必须保留模型原文、禁止用离线模板顶替的章节（缺内容时应重试生成或向用户暴露失败） */
const SECTION_KEYS_NO_TEMPLATE_FALLBACK = new Set<string>(["dont-list"]);

/** 展示层：已落库但某节正文与要点皆空时，用离线模板补齐（常见于历史模型 key 写错）；dont-list 等除外 */
export function patchEmptyAiSectionsWithTemplate(
  sections: AiAnalysisSection[],
  report: CompatibilityReport,
): AiAnalysisSection[] {
  const fallbacks = buildFallbackSections(report);
  const byKey = new Map(fallbacks.map((s) => [s.key, s]));
  return sections.map((section) => {
    if (SECTION_KEYS_NO_TEMPLATE_FALLBACK.has(section.key)) return section;
    const hasParagraph = (section.content?.trim() ?? "").length > 0;
    const hasBullets = (section.bullets?.some((b) => String(b).trim()) ?? false);
    if (hasParagraph || hasBullets) return section;
    const fb = byKey.get(section.key);
    if (!fb) return section;
    return {
      ...section,
      title: section.title?.trim() ? section.title : fb.title,
      content: fb.content,
      bullets: fb.bullets,
      example: fb.example ?? section.example,
    };
  });
}

function buildUserPrompt(request: AiAnalysisRequest): string {
  return [
    `语气预设：${request.tonePreset}`,
    "",
    "## 用户画像摘要",
    request.userProfileSummary,
    "",
    "## 匹配与叙事摘要",
    request.compatibilitySummary,
    "",
    "## 灵魂伴侣报告·结构化上下文（须充分引用）",
    request.structuredContext,
  ].join("\n");
}

function stripJsonFence(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "");
    t = t.replace(/\s*```\s*$/i, "");
  }
  return t.trim();
}

/** 与 SECTION_BLUEPRINT 对齐：模型常输出 dont_list / dontList 等，避免第 8 节等整段丢失 */
function normalizeParsedSectionKey(raw: string): string {
  let k = raw.trim();
  if (!k) return "";
  k = k.replace(/([a-z])([A-Z])/g, "$1-$2");
  return k.toLowerCase().replace(/_/g, "-");
}

function mergeBlueprintFromParsed(parsed: unknown): AiAnalysisSection[] {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("JSON 根非对象");
  }
  const arr = (parsed as { sections?: unknown }).sections;
  if (!Array.isArray(arr)) {
    throw new Error("缺少 sections 数组");
  }
  const byKey = new Map<string, { title?: string; content?: string; bullets?: unknown; example?: unknown }>();
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const key = normalizeParsedSectionKey(typeof o.key === "string" ? o.key : "");
    if (!key) continue;
    byKey.set(key, {
      title: typeof o.title === "string" ? o.title : undefined,
      content: typeof o.content === "string" ? o.content : undefined,
      bullets: o.bullets,
      example: o.example,
    });
  }

  return SECTION_BLUEPRINT.map(({ key, title: defaultTitle }) => {
    const row = byKey.get(key);
    const bullets = Array.isArray(row?.bullets) ? row!.bullets!.map((x) => String(x).trim()).filter(Boolean) : [];
    const example = row?.example != null ? String(row.example).trim() : "";
    return {
      key,
      title: row?.title && row.title.trim() ? row.title : defaultTitle,
      content: row?.content?.trim() || "",
      bullets: bullets.length ? bullets : undefined,
      example: example || undefined,
    };
  });
}

class DontListMissingError extends Error {
  override readonly name = "DontListMissingError";
  constructor() {
    super("AI 输出缺少「关系里暂时不要做什么」（dont-list）的有效正文或要点");
  }
}

function sectionHasSubstantiveBody(s: AiAnalysisSection): boolean {
  const c = (s.content?.trim() ?? "").length > 0;
  const b = s.bullets?.some((x) => String(x).trim()) ?? false;
  return c || b;
}

function assertDontListPresent(sections: AiAnalysisSection[]): void {
  const s = sections.find((x) => x.key === "dont-list");
  if (!s || !sectionHasSubstantiveBody(s)) {
    throw new DontListMissingError();
  }
}

/** JSON 解析成功但 dont-list 为空时不应降级到编号 legacy（会把整段 JSON 误拆） */
function parseAiAnalysisOutput(reportId: string, model: string, text: string, usageChars: number): AiAnalysisResult {
  try {
    return parseJsonOutput(reportId, model, text, usageChars);
  } catch (e) {
    if (e instanceof DontListMissingError) throw e;
    return parseNumberedLegacy(reportId, model, text);
  }
}

function parseJsonOutput(reportId: string, model: string, text: string, usageChars: number): AiAnalysisResult {
  const cleaned = stripJsonFence(text);
  const data = JSON.parse(cleaned) as { summary?: string };
  const sections = mergeBlueprintFromParsed(data);
  assertDontListPresent(sections);
  const summary =
    typeof data.summary === "string" && data.summary.trim()
      ? data.summary.trim()
      : sections.at(-1)?.content || "";
  return {
    reportId,
    sections,
    summary,
    model,
    tokensUsed: usageChars,
    status: "completed",
    generatedAt: new Date().toISOString(),
  };
}

/** 兼容旧版编号输出 */
function parseNumberedLegacy(reportId: string, model: string, text: string): AiAnalysisResult {
  const parts = text
    .split(/\n(?=\d+\.)/)
    .map((item) => item.trim())
    .filter(Boolean);

  const sections: AiAnalysisSection[] = SECTION_BLUEPRINT.map(({ key, title }, index) => ({
    key,
    title,
    content: parts[index]?.replace(/^\d+\.\s*/, "") || "",
  }));

  assertDontListPresent(sections);

  return {
    reportId,
    sections,
    summary: sections.at(-1)?.content || "",
    model,
    tokensUsed: text.length,
    status: "completed",
    generatedAt: new Date().toISOString(),
  };
}

export async function generateAiAnalysis(
  request: AiAnalysisRequest,
  report: CompatibilityReport,
): Promise<AiAnalysisResult> {
  const env = getEnv();
  const { openRouterKey, openAiKey } = resolveAiProviderKeys(env);

  if (!openRouterKey && !openAiKey) {
    const sections = buildFallbackSections(report);
    const summary = `基于 ${report.mbtiType} · ${report.sunSign} 与最佳匹配 ${report.bestMatch.mbti} 的测评结论，以下为离线模板深度解读（未调用大模型）。`;
    return {
      reportId: request.reportId,
      sections,
      summary,
      model: "fallback-template",
      tokensUsed: sections.map((s) => s.content + (s.bullets?.join("") ?? "")).join("").length,
      status: "completed",
      generatedAt: new Date().toISOString(),
    };
  }

  const system = buildSystemPrompt();
  const user = buildUserPrompt(request);

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < MAX_AI_ATTEMPTS; attempt++) {
    try {
      if (openRouterKey) {
        const client = new OpenAI({
          apiKey: openRouterKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            ...(env.openRouterHttpReferer ? { "HTTP-Referer": env.openRouterHttpReferer } : {}),
            ...(env.openRouterAppTitle ? { "X-Title": env.openRouterAppTitle } : {}),
          },
        });
        const completion = await client.chat.completions.create({
          model: env.openRouterModel,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: MAX_OUTPUT_TOKENS,
        });
        const output = completion.choices[0]?.message?.content?.trim();
        if (!output) {
          throw new Error("AI 未返回可用内容");
        }
        const usage =
          (completion.usage?.total_tokens ?? completion.usage?.completion_tokens ?? 0) || output.length;
        return parseAiAnalysisOutput(request.reportId, env.openRouterModel, output, usage);
      }

      const client = new OpenAI({ apiKey: openAiKey! });
      const response = await client.responses.create({
        model: env.openAiModel,
        instructions: system,
        input: user,
        max_output_tokens: MAX_OUTPUT_TOKENS,
      });

      const output = response.output_text?.trim();
      if (!output) {
        throw new Error("AI 未返回可用内容");
      }
      const usage = response.usage?.output_tokens ?? output.length;
      return parseAiAnalysisOutput(request.reportId, env.openAiModel, output, usage);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastErr ?? new Error("AI 生成失败");
}
