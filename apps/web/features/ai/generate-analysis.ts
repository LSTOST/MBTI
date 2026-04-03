import OpenAI from "openai";

import { getEnv } from "@/lib/env";
import type {
  AiAnalysisRequest,
  AiAnalysisResult,
  AiAnalysisSection,
  CompatibilityReport,
} from "@/lib/types";

function buildFallbackSections(report: CompatibilityReport): AiAnalysisSection[] {
  return [
    {
      key: "driver",
      title: "你的灵魂伴侣核心驱动力",
      content: `你不是随便心动的人，但一旦出现 ${report.bestMatch.mbti} 这种能接住你节奏的人，你会迅速把“好感”升级成“想认真看看”。你真正要的不是热闹，是又有感觉又有回应。`,
    },
    {
      key: "hidden-needs",
      title: "你在关系中的隐藏需求",
      content: `表面上你看起来能扛、能判断，实际上你很需要对方给出稳定而明确的反馈。你不一定会直说，但你会通过对方的行动频率来判断自己值不值得继续投入。`,
    },
    {
      key: "attraction",
      title: "你为什么容易被某类人吸引",
      content: `${report.bestMatch.zodiac} 的氛围感和 ${report.bestMatch.mbti} 的表达方式，刚好会打中你对“有人懂我、又能带动关系往前走”的期待。你会被那种既有张力又有推进感的人吸住。`,
    },
    {
      key: "pitfall",
      title: "你在暧昧期最容易踩的坑",
      content: `你最大的坑不是不会爱，是容易在感觉刚对上的时候提前替关系加戏。一旦对方回应模糊，你就容易在“再等等”和“是不是我想多了”之间来回内耗。`,
    },
    {
      key: "pace",
      title: "适合你的关系推进节奏",
      content: `最适合你的不是极快上头，也不是长期悬着，而是前期有明显回应，中期有稳定频率，后期能自然确认关系。只要节奏持续失衡，这段关系基本就不值得你继续赌。`,
    },
    {
      key: "summary",
      title: "私人顾问式总结",
      content: `你适合的关系，不是让你一直猜，而是让你越来越笃定。真正对的人，会同时满足你的情绪共鸣和现实推进，而不是只给你其中一半。`,
    },
  ];
}

/** PRD 11.7：结构化摘要 + 语气约束，不读取原始答题 */
function buildPrompt(request: AiAnalysisRequest) {
  const system = [
    "你是一位专业的亲密关系分析师，基于用户的人格测试结果生成灵魂伴侣向深度关系解读。",
    "风格：犀利、具体、有洞察力；像认识用户很久的朋友在分析 TA 的感情模式；不说鸡汤，不堆空泛形容词，不假装科学权威。",
    "边界：只基于提供的结构化数据；不承诺科学准确或保证找到真爱；结论须与规则报告一致。",
    "输出：按 6 个模块，每模块一段，段首用「1.」「2.」… 编号。",
    `语气预设：${request.tonePreset}`,
  ].join("\n");

  const user = [
    "## 规则报告摘要",
    request.userProfileSummary,
    "",
    "## 匹配与建议摘要",
    request.compatibilitySummary,
    "",
    "请生成 6 段解读：灵魂伴侣核心驱动力；关系中的隐藏需求；为什么容易被某类人吸引；暧昧期最容易踩的坑；适合的关系推进节奏；私人顾问式总结。",
  ].join("\n");

  return `${system}\n\n---\n\n${user}`;
}

const MAX_AI_ATTEMPTS = 3;

function parseModelOutput(reportId: string, model: string, text: string): AiAnalysisResult {
  const parts = text
    .split(/\n(?=\d+\.)/)
    .map((item) => item.trim())
    .filter(Boolean);

  const titles = [
    "你的灵魂伴侣核心驱动力",
    "你在关系中的隐藏需求",
    "你为什么容易被某类人吸引",
    "你在暧昧期最容易踩的坑",
    "适合你的关系推进节奏",
    "私人顾问式总结",
  ];

  const sections = titles.map((title, index) => ({
    key: `section-${index + 1}`,
    title,
    content: parts[index]?.replace(/^\d+\.\s*/, "") || "",
  }));

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

  if (!env.openRouterApiKey && !env.openAiApiKey) {
    const sections = buildFallbackSections(report);
    return {
      reportId: request.reportId,
      sections,
      summary: sections.at(-1)?.content || "",
      model: "fallback-template",
      tokensUsed: sections.map((section) => section.content).join("").length,
      status: "completed",
      generatedAt: new Date().toISOString(),
    };
  }

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < MAX_AI_ATTEMPTS; attempt++) {
    try {
      if (env.openRouterApiKey) {
        const client = new OpenAI({
          apiKey: env.openRouterApiKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            ...(env.openRouterHttpReferer ? { "HTTP-Referer": env.openRouterHttpReferer } : {}),
            ...(env.openRouterAppTitle ? { "X-Title": env.openRouterAppTitle } : {}),
          },
        });
        const completion = await client.chat.completions.create({
          model: env.openRouterModel,
          messages: [{ role: "user", content: buildPrompt(request) }],
        });
        const output = completion.choices[0]?.message?.content?.trim();
        if (!output) {
          throw new Error("AI 未返回可用内容");
        }
        return parseModelOutput(request.reportId, env.openRouterModel, output);
      }

      const client = new OpenAI({ apiKey: env.openAiApiKey! });
      const response = await client.responses.create({
        model: env.openAiModel,
        input: buildPrompt(request),
      });

      const output = response.output_text?.trim();
      if (!output) {
        throw new Error("AI 未返回可用内容");
      }

      return parseModelOutput(request.reportId, env.openAiModel, output);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastErr ?? new Error("AI 生成失败");
}
