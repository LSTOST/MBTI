import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";

import { createPaymentIntent } from "@/features/report/repository";
import { getEnv } from "@/lib/env";
import { getPublicUnlockMode } from "@/lib/unlock-mode";
import { validateAndApplyCoupon, recordCouponUse } from "@/lib/coupon";
import { prisma } from "@/lib/db";

type Context = { params: Promise<{ reportId: string }> };

const bodySchema = z.object({
  channel: z.enum(["wechat_jsapi", "wechat_h5", "alipay_h5"]).optional(),
  couponCode: z.string().min(1).max(40).optional(),
});

/** PRD：创建预支付订单，返回 orderId 供轮询与回调关联 */
export async function POST(request: Request, context: Context) {
  if (getPublicUnlockMode() !== "payment") {
    return NextResponse.json({ error: "当前未开启支付解锁" }, { status: 403 });
  }

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
  const couponCode = parsed.data.couponCode?.trim() || null;

  try {
    const order = await createPaymentIntent(reportId, channel);

    // 优惠码校验与应用
    if (couponCode) {
      // 读取当前用户 ID（HttpOnly cookie 中的 userId）
      const cookieStore = await cookies();
      const userId = cookieStore.get("userId")?.value ?? "";

      // 读取 report 的 testId（可能为 null，历史订单无 testId）
      const report = await prisma.report.findUnique({
        where: { id: order.reportId },
        select: { testId: true },
      });

      const result = await validateAndApplyCoupon(
        couponCode,
        order.amount,
        userId,
        report?.testId ?? null,
      );

      if (!result.ok) {
        return NextResponse.json({ error: result.error, orderId: order.id }, { status: 422 });
      }

      // 更新订单金额并绑定优惠码
      await prisma.order.update({
        where: { id: order.id },
        data: {
          amount: result.finalAmount,
          originalAmount: result.originalAmount,
          discountAmount: result.discountAmount,
          couponId: result.couponId,
        },
      });

      // 记录优惠码使用（CouponUse.orderId unique 防并发重复）
      if (result.discountAmount > 0) {
        try {
          await recordCouponUse(result.couponId, order.id, userId, result.discountAmount);
        } catch {
          // 唯一约束冲突 = 已记录过，安全忽略
        }
      }

      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        amount: result.finalAmount,
        originalAmount: result.originalAmount,
        discountAmount: result.discountAmount,
        currency: order.currency,
        expiredAt: order.expiredAt?.toISOString() ?? null,
        couponApplied: true,
      });
    }

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
