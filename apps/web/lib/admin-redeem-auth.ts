import { NextResponse } from "next/server";

import {
  getAdminRedeemSecret,
  getSessionCookieFromRequest,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

/**
 * 管理接口鉴权：优先校验 httpOnly 会话 Cookie；兼容 Bearer = ADMIN_REDEEM_SECRET（脚本/调试）。
 */
export function assertAdminAuthorized(req: Request): NextResponse | null {
  const secret = getAdminRedeemSecret();
  if (!secret) {
    return NextResponse.json({ error: "未配置 ADMIN_REDEEM_SECRET" }, { status: 503 });
  }

  const cookieToken = getSessionCookieFromRequest(req);
  if (cookieToken && verifyAdminSessionToken(cookieToken, secret)) {
    return null;
  }

  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (bearer === secret) {
    return null;
  }

  return NextResponse.json({ error: "未授权" }, { status: 401 });
}

/** @deprecated 使用 assertAdminAuthorized */
export const assertAdminRedeemAuthorized = assertAdminAuthorized;
