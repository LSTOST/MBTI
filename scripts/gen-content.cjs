#!/usr/bin/env node
/**
 * Regenerate apps/web/lib/content-data.ts from apps/web/content/*.md
 *
 * Run from repo root:
 *   node scripts/gen-content.cjs
 */

const fs = require("fs");
const path = require("path");

const contentDir = path.resolve(__dirname, "../apps/web/content");
const outFile = path.resolve(__dirname, "../apps/web/lib/content-data.ts");

const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".md")).sort();

const entries = files.map((f) => {
  const slug = f.replace(".md", "");
  const raw = fs.readFileSync(path.join(contentDir, f), "utf-8");
  // Escape backticks and template literal placeholders
  const escaped = raw.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return `  ${JSON.stringify(slug)}: \`${escaped}\``;
});

const output = [
  "// AUTO-GENERATED — do not edit by hand.",
  "// Source: apps/web/content/*.md",
  "// Regenerate with: node scripts/gen-content.cjs",
  "//",
  "// All markdown content is inlined as string literals so no fs access is needed",
  "// at runtime. Works in standalone builds, Docker, PM2, Vercel, etc.",
  "",
  "export const RAW_CONTENT: Record<string, string> = {",
  entries.join(",\n"),
  "};",
  "",
].join("\n");

fs.writeFileSync(outFile, output, "utf-8");
console.log(`✓ Generated ${files.length} entries → ${path.relative(process.cwd(), outFile)}`);
