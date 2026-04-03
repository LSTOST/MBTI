import { NextResponse } from "next/server";

import { createPaymentIntent, markReportPaid } from "@/features/report/repository";
import { getEnv } from "@/lib/env";

type Context = {
  params: Promise<{ reportId: string }>;
};

/**
 * 核销支付并解锁报告。
 * - PAYMENT_PROVIDER=mock：直接记为已付（开发/内测）。
 * - wechat / alipay：创建/复用待支付订单并返回 orderId，由前端轮询 + 回调核销（见 /api/payment/*）。
 */
export async function POST(_req: Request, context: Context) {
  try {
    const { reportId } = await context.params;
    const env = getEnv();

    if (env.paymentProvider !== "mock") {
      const channel =
        env.paymentProvider === "alipay" ? "alipay_h5" : ("wechat_h5" as const);
      const order = await createPaymentIntent(reportId, channel);
      return NextResponse.json(
        {
          error:
            "请跳转收银台完成支付；支付成功后平台将回调服务端。联调可 POST /api/payment/callback/wechat 传入 { \"orderId\" }。",
          code: "PAYMENT_GATEWAY_REQUIRED",
          orderId: order.id,
          pollUrl: `/api/payment/status/${order.id}`,
        },
        { status: 402 },
      );
    }

    const report = await markReportPaid(reportId);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "支付失败" },
      { status: 400 },
    );
  }
}

