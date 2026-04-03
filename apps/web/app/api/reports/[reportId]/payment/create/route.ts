import { NextResponse } from "next/server";
import { z } from "zod";

import { createPaymentIntent } from "@/features/report/repository";
import { getEnv } from "@/lib/env";

type Context = { params: Promise<{ reportId: string }> };

const bodySchema = z.object({
  channel: z.enum(["wechat_jsapi", "wechat_h5", "alipay_h5"]).optional(),
});

/** PRD：创建预支付订单，返回 orderId 供轮询与回调关联 */
export async function POST(request: Request, context: Context) {
  const { reportId } = await context.params;
  const env = getEnv();
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  const defaultChannel =
    env.paymentProvider === "alipay" ? "alipay_h5" : ("wechat_h5" as const);
  const channel = parsed.data.channel ?? defaultChannel;

  try {
    const order = await createPaymentIntent(reportId, channel);
    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      expiredAt: order.expiredAt?.toISOString() ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "创建订单失败" },
      { status: 400 },
    );
  }
}
