import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";

/**
 * GET /api/admin/orders
 *
 * 查询参数（全部可选）：
 *   status   = created|paying|paid|fulfilled|expired|failed
 *   channel  = wechat_jsapi|wechat_h5|alipay_h5|mock|redeem
 *   q        = 模糊搜索订单 id / 报告 slug / 微信单号
 *   from     = ISO 日期，createdAt >=
 *   to       = ISO 日期，createdAt <=
 *   page     = 页码（1 起），默认 1
 *   pageSize = 默认 50，最大 200
 */
export async function GET(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status")?.trim() || null;
    const channel = url.searchParams.get("channel")?.trim() || null;
    const q = url.searchParams.get("q")?.trim() || null;
    const fromStr = url.searchParams.get("from")?.trim() || null;
    const toStr = url.searchParams.get("to")?.trim() || null;
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") ?? "50") || 50));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (channel) where.paymentChannel = channel;
    if (fromStr || toStr) {
      const createdAt: Record<string, Date> = {};
      if (fromStr) { const d = new Date(fromStr); if (!isNaN(d.getTime())) createdAt.gte = d; }
      if (toStr) { const d = new Date(toStr); if (!isNaN(d.getTime())) createdAt.lte = d; }
      if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;
    }
    if (q) {
      where.OR = [
        { id: { contains: q } },
        { thirdPartyOrderId: { contains: q } },
        { report: { slug: { contains: q } } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          report: { select: { id: true, slug: true, mbtiType: true, userId: true } },
          coupon: { select: { id: true, codeNormalized: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const overview = await prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { amount: true },
    });
    const stats: Record<string, { count: number; revenue: number }> = {};
    for (const row of overview) {
      stats[row.status] = { count: row._count._all, revenue: row._sum.amount ?? 0 };
    }

    return NextResponse.json({
      items: rows.map((o) => ({
        id: o.id,
        status: o.status,
        amount: o.amount,
        originalAmount: o.originalAmount,
        discountAmount: o.discountAmount,
        currency: o.currency,
        paymentChannel: o.paymentChannel,
        thirdPartyOrderId: o.thirdPartyOrderId,
        paidAt: o.paidAt?.toISOString() ?? null,
        expiredAt: o.expiredAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
        report: o.report ? {
          id: o.report.id,
          slug: o.report.slug,
          mbtiType: o.report.mbtiType,
        } : null,
        coupon: o.coupon ? {
          id: o.coupon.id,
          code: o.coupon.codeNormalized,
        } : null,
      })),
      total,
      page,
      pageSize,
      stats,
    });
  } catch (error) {
    console.error("[admin/orders GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}
