import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { getReportRecord } from "@/features/report/repository";

type Context = { params: Promise<{ reportId: string }> };

/** 客户端据此决定：mock 直调 /pay，或跳转微信支付宝 H5 收银台 */
export async function GET(_: Request, context: Context) {
  const { reportId } = await context.params;
  const record = await getReportRecord(reportId);
  if (!record) {
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }

  const env = getEnv();
  const template = env.paymentCheckoutUrlTemplate?.trim();
  const checkoutUrl = template?.includes("{{reportId}}")
    ? template.replace(/\{\{reportId\}\}/g, reportId)
    : template;

  return NextResponse.json({
    provider: env.paymentProvider,
    checkoutUrl: checkoutUrl || null,
  });
}
