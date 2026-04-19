import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

type Context = { params: Promise<{ testSlug: string }> };

const bodySchema = z.object({
  code: z.string().min(1).max(60),
});

/**
 * 用户侧兑换码验证接口。
 * 验证通过后设置 HttpOnly cookie quiz_access_{testSlug}，有效期 4 小时。
 * 同时递增 redemptionCount（一码一次入场，防止多开）。
 */
export async function POST(req: Request, context: Context) {
  const { testSlug } = await context.params;

  // 加载测试
  const test = await prisma.testTemplate.findUnique({
    where: { slug: testSlug },
    select: { id: true, slug: true, status: true, accessMode: true },
  });
  if (!test || test.status !== "published") {
    return NextResponse.json({ error: "测试不存在或未发布" }, { status: 404 });
  }
  if (test.accessMode !== "redeem_required") {
    return NextResponse.json({ error: "该测试无需兑换码" }, { status: 400 });
  }

  // 解析请求体
  let parsed: z.infer<typeof bodySchema>;
  try {
    const raw = (await req.json()) as unknown;
    parsed = bodySchema.parse(raw);
  } catch {
    return NextResponse.json({ error: "请输入兑换码" }, { status: 400 });
  }

  const codeInput = parsed.code.trim().toUpperCase();

  // 查找兑换码（全站通用 testId=null 或精确匹配本测试）
  const rc = await prisma.redemptionCode.findFirst({
    where: {
      codeNormalized: codeInput,
      active: true,
      OR: [{ testId: null }, { testId: test.id }],
    },
  });

  if (!rc) {
    return NextResponse.json({ error: "兑换码无效或已停用" }, { status: 400 });
  }
  if (rc.expiresAt && rc.expiresAt < new Date()) {
    return NextResponse.json({ error: "兑换码已过期" }, { status: 400 });
  }
  if (rc.maxRedemptions > 0 && rc.redemptionCount >= rc.maxRedemptions) {
    return NextResponse.json({ error: "兑换码次数已用完" }, { status: 400 });
  }

  // 核销：递增使用次数
  await prisma.redemptionCode.update({
    where: { id: rc.id },
    data: { redemptionCount: { increment: 1 } },
  });

  // 设置访问 cookie
  const cookieKey = `quiz_access_${testSlug}`;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieKey, rc.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 4, // 4 小时
    path: "/",
  });
  return response;
}
