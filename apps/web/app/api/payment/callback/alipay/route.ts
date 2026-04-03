import { NextResponse } from "next/server";

import { completeOrderPayment } from "@/features/report/repository";

/** 支付宝异步通知占位，联调格式同微信回调 */
export async function POST(request: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  if (secret) {
    const h = request.headers.get("x-webhook-secret");
    if (h !== secret) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const thirdPartyOrderId =
    typeof body.thirdPartyOrderId === "string" ? body.thirdPartyOrderId : undefined;

  try {
    await completeOrderPayment(orderId, thirdPartyOrderId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "核销失败" },
      { status: 400 },
    );
  }
}
