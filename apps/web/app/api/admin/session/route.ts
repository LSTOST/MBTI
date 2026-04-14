import { NextResponse } from "next/server";
import { z } from "zod";

import { ADMIN_SESSION_COOKIE, createAdminSessionToken, getAdminRedeemSecret } from "@/lib/admin-session";

const loginSchema = z.object({
  password: z.string().min(1),
});

/** 登录：校验密钥后下发 httpOnly 会话 Cookie */
export async function POST(req: Request) {
  const secret = getAdminRedeemSecret();
  if (!secret) {
    return NextResponse.json({ error: "未配置 ADMIN_REDEEM_SECRET" }, { status: 503 });
  }

  try {
    const body = loginSchema.parse((await req.json()) as unknown);
    if (body.password !== secret) {
      return NextResponse.json({ error: "密钥错误" }, { status: 401 });
    }

    const token = createAdminSessionToken(secret);
    const res = NextResponse.json({ ok: true });
    const secure = process.env.NODE_ENV === "production";
    res.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }
}

/** 登出：清除会话 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
