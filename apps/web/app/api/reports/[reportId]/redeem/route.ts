import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { markReportUnlockedViaRedeem } from "@/features/report/repository";
import { getPublicUnlockMode } from "@/lib/unlock-mode";

const COOKIE = "mbti_uid";

const bodySchema = z.object({
  code: z.string(),
});

type Context = {
  params: Promise<{ reportId: string }>;
};

export async function POST(req: Request, context: Context) {
  if (getPublicUnlockMode() !== "redeem") {
    return NextResponse.json({ error: "当前未开启兑换解锁" }, { status: 403 });
  }

  try {
    const jar = await cookies();
    const userId = jar.get(COOKIE)?.value;
    if (!userId) {
      return NextResponse.json({ error: "请先完成测试并生成报告" }, { status: 401 });
    }

    const { reportId } = await context.params;
    const json = (await req.json()) as unknown;
    const { code } = bodySchema.parse(json);

    const view = await markReportUnlockedViaRedeem(reportId, userId, code);
    return NextResponse.json({ ok: true, hasPaid: view?.hasPaid });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "兑换失败";
    const isClient =
      msg === "兑换码无效或已失效" ||
      msg === "报告不存在" ||
      msg === "无权操作" ||
      msg === "尝试过于频繁，请稍后再试";
    return NextResponse.json({ error: msg }, { status: isClient ? 400 : 500 });
  }
}
