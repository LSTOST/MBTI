import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { abandonQuizProgress, getQuizProgress, saveQuizProgress } from "@/lib/quiz-progress";

const COOKIE = "mbti_uid";

const postSchema = z.object({
  attemptId: z.string().optional().nullable(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      value: z.number().int().min(1).max(5),
    }),
  ),
  currentQuestionIndex: z.number().int().min(0),
});

/** PRD 9.11：GET 恢复进度；POST 每 5 题同步快照 */
export async function GET() {
  const jar = await cookies();
  const userId = jar.get(COOKIE)?.value;
  if (!userId) {
    return NextResponse.json({ error: "用户身份未识别", code: "AUTH_NO_USER" }, { status: 401 });
  }

  const progress = await getQuizProgress(userId);
  return NextResponse.json(progress);
}

export async function POST(request: Request) {
  const jar = await cookies();
  const userId = jar.get(COOKIE)?.value;
  if (!userId) {
    return NextResponse.json({ error: "用户身份未识别", code: "AUTH_NO_USER" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = postSchema.parse(body);
    const { attemptId } = await saveQuizProgress(userId, parsed);
    return NextResponse.json({ attemptId, ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "同步失败" },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const jar = await cookies();
  const userId = jar.get(COOKIE)?.value;
  if (!userId) {
    return NextResponse.json({ error: "用户身份未识别", code: "AUTH_NO_USER" }, { status: 401 });
  }

  await abandonQuizProgress(userId);
  return NextResponse.json({ ok: true });
}
