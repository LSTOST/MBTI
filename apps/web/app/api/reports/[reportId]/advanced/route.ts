import { NextResponse } from "next/server";
import { z } from "zod";

import { submitAdvancedQuiz } from "@/features/report/repository";

const payloadSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      value: z.number().int().min(1).max(5),
    }),
  ),
});

type Context = {
  params: Promise<{ reportId: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { reportId } = await context.params;
    const body = await request.json();
    const { answers } = payloadSchema.parse(body);
    const result = await submitAdvancedQuiz(reportId, answers);
    return NextResponse.json({ facetResult: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "提交进阶测试失败" },
      { status: 400 },
    );
  }
}
