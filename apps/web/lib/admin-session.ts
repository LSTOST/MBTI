import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "mbti_admin_sess";
/** 会话有效期（秒），默认 8 小时 */
const TTL_SEC = 8 * 60 * 60;

export function getAdminRedeemSecret(): string | undefined {
  return process.env.ADMIN_REDEEM_SECRET?.trim() || undefined;
}

export function createAdminSessionToken(secret: string): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const payload = `v1:${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return Buffer.from(JSON.stringify({ exp, sig }), "utf8").toString("base64url");
}

export function verifyAdminSessionToken(token: string, secret: string): boolean {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { exp?: number; sig?: string };
    if (typeof parsed.exp !== "number" || typeof parsed.sig !== "string") return false;
    if (Math.floor(Date.now() / 1000) > parsed.exp) return false;
    const payload = `v1:${parsed.exp}`;
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    const a = Buffer.from(parsed.sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getSessionCookieFromRequest(req: Request): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === ADMIN_SESSION_COOKIE && rest.length > 0) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return undefined;
}

export function verifySessionFromRequest(req: Request, secret: string): boolean {
  const token = getSessionCookieFromRequest(req);
  if (!token) return false;
  return verifyAdminSessionToken(token, secret);
}
