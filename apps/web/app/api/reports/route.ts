import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createReportFromSubmission } from "@/features/report/repository";

const payloadSchema = z.object({
  profile: z.object({
    nickname: z.string().min(1).max(12),
    gender: z.enum(["male", "female"]),
    birthDate: z.string().min(1),
  }),
  answers: z.array(
    z.object({
      questionId: z.string(),
      value: z.number().int().min(1).max(5),
    }),
  ),
});

const COOKIE = "mbti_uid";

export async function POST(request: Request) {
  try {
    const jar = await cookies();
    const userId = jar.get(COOKIE)?.value;
    if (!userId) {
      return NextResponse.json(
        { error: "用户身份未识别", code: "AUTH_NO_USER" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const payload = payloadSchema.parse(body);
    const report = await createReportFromSubmission(payload, userId);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成报告失败" },
      { status: 400 },
    );
  }
}

