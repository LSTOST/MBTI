import { NextResponse } from "next/server";

import { getPaymentOrderById } from "@/features/report/repository";

type Context = { params: Promise<{ orderId: string }> };

/** PRD 9.8：前端轮询订单状态（间隔 1s，最多 30s 由客户端控制） */
export async function GET(_: Request, context: Context) {
  const { orderId } = await context.params;
  const order = await getPaymentOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  return NextResponse.json({
    status: order.status,
    reportId: order.report.id,
    reportSlug: order.report.slug,
    paidAt: order.paidAt?.toISOString() ?? null,
    expiredAt: order.expiredAt?.toISOString() ?? null,
  });
}
