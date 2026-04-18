import { readFileSync } from "fs";
import { join } from "path";

/** 中文星座名 → 文件 slug */
const ZODIAC_SLUG: Record<string, string> = {
  白羊座: "aries",
  金牛座: "taurus",
  双子座: "gemini",
  巨蟹座: "cancer",
  狮子座: "leo",
  处女座: "virgo",
  天秤座: "libra",
  天蝎座: "scorpio",
  射手座: "sagittarius",
  摩羯座: "capricorn",
  水瓶座: "aquarius",
  双鱼座: "pisces",
};

export type ContentSection = {
  title: string;
  paragraphs: string[];
  bullets: string[];
  example?: string;
};

/**
 * 解析 md 文本 → ContentSection[]
 *
 * md 文件结构：
 *   # TYPE · 灵魂伴侣深度报告     ← 跳过
 *
 *   ## 核心驱动力                 ← section 标题
 *
 *   正文段落……
 *
 *   **要点**
 *   - bullet 1
 *   - bullet 2
 *
 *   **沟通示例**
 *   「示例文字」
 *
 *   ---                           ← section 分隔符
 */
function parseContent(md: string): ContentSection[] {
  // 按 HR 分割各 section（兼容 `\r\n`）
  const blocks = md.split(/\n---+\n/);
  const sections: ContentSection[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    let title = "";
    const paragraphs: string[] = [];
    const bullets: string[] = [];
    let example: string | undefined;

    let mode: "body" | "bullets" | "example" = "body";

    for (const raw of lines) {
      const line = raw.trimEnd();

      // 跳过文件大标题
      if (line.startsWith("# ")) continue;

      // section 标题
      if (line.startsWith("## ")) {
        title = line.replace(/^## /, "").trim();
        mode = "body";
        continue;
      }

      // 切换到要点模式
      if (line === "**要点**") {
        mode = "bullets";
        continue;
      }

      // 切换到示例模式
      if (line === "**沟通示例**") {
        mode = "example";
        continue;
      }

      // 空行：仅重置 example 模式回 body
      if (line === "") {
        if (mode === "example") mode = "body";
        continue;
      }

      if (mode === "bullets") {
        if (line.startsWith("- ")) {
          bullets.push(line.replace(/^- /, "").trim());
        }
      } else if (mode === "example") {
        example = line.trim();
        mode = "body";
      } else {
        // body 模式：普通段落（跳过加粗标记行）
        if (!line.startsWith("**")) {
          paragraphs.push(line.trim());
        }
      }
    }

    if (title) {
      sections.push({ title, paragraphs, bullets, example });
    }
  }

  return sections;
}

function readContent(slug: string): ContentSection[] {
  try {
    const filePath = join(process.cwd(), "content", `${slug}.md`);
    const md = readFileSync(filePath, "utf-8");
    return parseContent(md);
  } catch {
    return [];
  }
}

/** 根据 MBTI 类型（如 "INFP"）读取内容 */
export function getMbtiContent(mbtiType: string): ContentSection[] {
  return readContent(mbtiType.toLowerCase());
}

/** 根据中文星座名（如 "白羊座"）读取内容 */
export function getZodiacContent(sunSign: string): ContentSection[] {
  const slug = ZODIAC_SLUG[sunSign];
  if (!slug) return [];
  return readContent(slug);
}
