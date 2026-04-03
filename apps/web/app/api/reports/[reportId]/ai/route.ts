import { NextResponse } from "next/server";

import { generateReportAi } from "@/features/report/repository";

type Context = {
  params: Promise<{ reportId: string }>;
};

export async function POST(_: Request, context: Context) {
  try {
    const { reportId } = await context.params;
    const report = await generateReportAi(reportId);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 生成失败" },
      { status: 400 },
    );
  }
}
