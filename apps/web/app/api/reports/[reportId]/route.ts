import { NextResponse } from "next/server";

import { getReportView } from "@/features/report/repository";

type Context = {
  params: Promise<{ reportId: string }>;
};

export async function GET(_: Request, context: Context) {
  const { reportId } = await context.params;
  const report = await getReportView(reportId);

  if (!report) {
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }

  return NextResponse.json(report);
}

