import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { ShareType } from "@/generated/prisma/enums";

const COOKIE = "mbti_uid";

const bodySchema = z.object({
  reportId: z.string().min(1),
  shareType: z.enum(["free_card", "paid_card", "ai_card"]),
  shareChannel: z.string().min(1).max(64),
});

/** PRD 13.3：记录分享事件 */
export async function POST(request: Request) {
  const jar = await cookies();
  const userId = jar.get(COOKIE)?.value;
  if (!userId) {
    return NextResponse.json({ error: "用户身份未识别", code: "AUTH_NO_USER" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const body = bodySchema.parse(json);

    const report = await prisma.report.findFirst({
      where: { OR: [{ id: body.reportId }, { slug: body.reportId }] },
    });
    if (!report) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    const shareTypeEnum =
      body.shareType === "paid_card"
        ? ShareType.paid_card
        : body.shareType === "ai_card"
          ? ShareType.ai_card
          : ShareType.free_card;

    await prisma.shareEvent.create({
      data: {
        userId,
        reportId: report.id,
        shareType: shareTypeEnum,
        shareChannel: body.shareChannel,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "记录失败" },
      { status: 400 },
    );
  }
}
