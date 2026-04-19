/**
 * 优惠码校验与计算。
 *
 * 使用点：下单时（payment/create）接受 couponCode，服务端验证后写入 Order。
 * 所有金额单位均为分（分/CNY）。
 */

import { prisma } from "@/lib/db";

export type CouponApplyResult =
  | {
      ok: true;
      couponId: string;
      originalAmount: number;
      discountAmount: number;
      finalAmount: number;
    }
  | { ok: false; error: string };

/**
 * 验证优惠码并计算折后金额。
 *
 * 校验项：
 *   - 码存在且 active=true
 *   - 在有效期内（startsAt / expiresAt）
 *   - 总使用次数未超 maxRedemptions
 *   - 当前用户使用次数未超 perUserLimit
 *   - 订单金额 ≥ minAmount
 *   - 若 scope=test，testId 必须匹配
 */
export async function validateAndApplyCoupon(
  code: string,
  orderAmount: number,
  userId: string,
  testId?: string | null,
): Promise<CouponApplyResult> {
  const codeNormalized = code.toUpperCase().trim();
  const coupon = await prisma.coupon.findUnique({ where: { codeNormalized } });

  if (!coupon) return { ok: false, error: "优惠码不存在" };
  if (!coupon.active) return { ok: false, error: "优惠码已停用" };

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, error: "优惠码尚未生效" };
  if (coupon.expiresAt && now > coupon.expiresAt) return { ok: false, error: "优惠码已过期" };

  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return { ok: false, error: "优惠码已达使用上限" };
  }

  if (coupon.minAmount > 0 && orderAmount < coupon.minAmount) {
    return {
      ok: false,
      error: `订单金额不足，需满 ¥${(coupon.minAmount / 100).toFixed(2)} 方可使用`,
    };
  }

  if (coupon.scope === "test") {
    if (!testId || coupon.testId !== testId) {
      return { ok: false, error: "该优惠码仅限指定测试可用" };
    }
  }

  if (coupon.perUserLimit !== null) {
    const usedCount = await prisma.couponUse.count({
      where: { couponId: coupon.id, userId },
    });
    if (usedCount >= coupon.perUserLimit) {
      return { ok: false, error: "你已达该优惠码的个人使用上限" };
    }
  }

  let discountAmount: number;
  if (coupon.type === "percent_off") {
    discountAmount = Math.floor((orderAmount * coupon.value) / 100);
  } else {
    // amount_off：最多抵扣到 0 元
    discountAmount = Math.min(coupon.value, orderAmount);
  }

  const finalAmount = Math.max(0, orderAmount - discountAmount);

  return {
    ok: true,
    couponId: coupon.id,
    originalAmount: orderAmount,
    discountAmount,
    finalAmount,
  };
}

/**
 * 记录优惠码使用（必须在订单创建成功后调用；并发安全依赖 CouponUse.orderId unique）。
 */
export async function recordCouponUse(
  couponId: string,
  orderId: string,
  userId: string,
  discount: number,
): Promise<void> {
  await prisma.$transaction([
    prisma.couponUse.create({
      data: { couponId, orderId, userId, discount },
    }),
    prisma.coupon.update({
      where: { id: couponId },
      data: { redemptionCount: { increment: 1 } },
    }),
  ]);
}
