import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 从某一目录逐级向上，每一层都尝试 `{当前目录}/content`。
 * - process.cwd() 可在任意工作目录启动 next 时命中 apps/web/content 或 仓库根/content
 * - import.meta.url 在打包后指向 .next/server/chunks/xxx.js，逐级向上可命中 apps/web/content
 */
function enumerateContentRoots(startDir: string, maxHops = 14): string[] {
  const roots: string[] = [];
  let cur = startDir;
  for (let i = 0; i < maxHops; i++) {
    roots.push(join(cur, "content"));
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return roots;
}

function allContentDirs(): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  const push = (p: string) => {
    const norm = join(p); // normalize
    if (!seen.has(norm)) {
      seen.add(norm);
      ordered.push(norm);
    }
  };

  const envDir = process.env.CONTENT_MD_DIR?.trim();
  if (envDir) push(envDir);

  for (const r of enumerateContentRoots(process.cwd())) push(r);

  try {
    const bundledFile = dirname(fileURLToPath(import.meta.url));
    for (const r of enumerateContentRoots(bundledFile)) push(r);
  } catch {
    /* noop */
  }

  return ordered;
}

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
  const fileName = `${slug}.md`;
  for (const dir of allContentDirs()) {
    const filePath = join(dir, fileName);
    try {
      if (!existsSync(filePath)) continue;
      const md = readFileSync(filePath, "utf-8");
      const sections = parseContent(md);
      if (sections.length > 0) return sections;
    } catch {
      continue;
    }
  }
  return [];
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
