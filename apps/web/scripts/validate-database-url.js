/**
 * 防止 DATABASE_URL 里误填中文/Unicode 省略号「……」等占位符导致 Prisma 报 P1001。
 * 用法：node scripts/validate-database-url.js
 */
const u = process.env.DATABASE_URL;
if (!u || typeof u !== "string") {
  console.error("DATABASE_URL 未设置或无效。");
  process.exit(1);
}
// 文档里常见的「……」占位符；或 URL 里未转义的 U+2026（Prisma 报错里出现过 %E2%80%A6）
if (u.includes("\u2026") || u.includes("\u22EF") || /%E2%80%A6/i.test(u)) {
  console.error(
    "DATABASE_URL 中误含省略号占位符（…… 或 %E2%80%A6），请把 @ 后面换成真实数据库主机名或 IP。",
  );
  process.exit(1);
}
let host;
try {
  host = new URL(u.replace(/^postgresql(\+[a-z]+)?:/i, "http:")).hostname;
} catch {
  console.error("DATABASE_URL 不是合法的连接串。");
  process.exit(1);
}
if (!host) {
  console.error("DATABASE_URL 缺少主机名（@ 后面应为真实地址）。");
  process.exit(1);
}
// P1001 若显示 %E2%80%A6 即 URL 里出现了 Unicode 省略号 U+2026（常被误粘贴为占位符「……」）
if (host.includes("\u2026") || host.includes("\u22EF") || /^\.{2,}$/.test(host)) {
  console.error(
    'DATABASE_URL 的主机名像是占位符（如 ……），请改为真实地址，例如：127.0.0.1、内网 IP、或云数据库域名。\n' +
      "当前解析到的 hostname：" +
      JSON.stringify(host),
  );
  process.exit(1);
}
