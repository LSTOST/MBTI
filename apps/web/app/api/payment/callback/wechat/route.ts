import { NextResponse } from "next/server";

import { completeOrderPayment } from "@/features/report/repository";

/**
 * 微信支付异步通知占位：生产环境须校验签名与金额后再调用 completeOrderPayment。
 * 联调：POST JSON `{ "orderId": "<uuid>" [, "thirdPartyOrderId": "wx_xxx"] }`
 * 可选头：`x-webhook-secret` 与 `PAYMENT_WEBHOOK_SECRET` 一致。
 */
export async function POST(request: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  if (secret) {
    const h = request.headers.get("x-webhook-secret");
    if (h !== secret) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  let body: Record<string, unknown> = {};
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  } else {
    const text = await request.text();
    if (text) {
      try {
        body = JSON.parse(text) as Record<string, unknown>;
      } catch {
        body = { raw: text };
      }
    }
  }

  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const thirdPartyOrderId =
    typeof body.thirdPartyOrderId === "string" ? body.thirdPartyOrderId : undefined;

  try {
    await completeOrderPayment(orderId, thirdPartyOrderId);
    return NextResponse.json({ code: "SUCCESS" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "核销失败" },
      { status: 400 },
    );
  }
}
