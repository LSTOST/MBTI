import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

type Context = { params: Promise<{ orderId: string }> };

export async function GET(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { orderId } = await context.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        report: {
          select: {
            id: true,
            slug: true,
            mbtiType: true,
            userId: true,
            createdAt: true,
          },
        },
        coupon: {
          select: {
            id: true,
            codeNormalized: true,
            type: true,
            value: true,
            scope: true,
          },
        },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    return NextResponse.json({
      id: order.id,
      status: order.status,
      amount: order.amount,
      originalAmount: order.originalAmount,
      discountAmount: order.discountAmount,
      currency: order.currency,
      paymentChannel: order.paymentChannel,
      thirdPartyOrderId: order.thirdPartyOrderId,
      paidAt: order.paidAt?.toISOString() ?? null,
      expiredAt: order.expiredAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      report: order.report,
      coupon: order.coupon,
    });
  } catch (error) {
    console.error("[admin/orders/:id GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

/** POST /api/admin/orders/:id/mark-paid — 手工标记已付，仅限未付状态。 */
export async function POST(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { orderId } = await context.params;
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }
    if (existing.status === "paid" || existing.status === "fulfilled") {
      return NextResponse.json({ error: "订单已处于支付/完成状态" }, { status: 409 });
    }

    const row = await prisma.order.update({
      where: { id: orderId },
      data: { status: "paid", paidAt: new Date() },
    });

    await recordAudit({
      action: "order.mark_paid",
      targetType: "Order",
      targetId: orderId,
      diff: { from: existing.status, to: "paid", amount: existing.amount },
      request: req,
    });

    return NextResponse.json({ ok: true, id: row.id, status: row.status });
  } catch (error) {
    console.error("[admin/orders/:id POST mark-paid]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 },
    );
  }
}
