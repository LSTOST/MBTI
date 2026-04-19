import { notFound } from "next/navigation";

import { PageHeader } from "@/features/admin/ui/page-header";
import { Badge } from "@/features/admin/ui/badge";
import { prisma } from "@/lib/db";
import { CouponDetailClient } from "@/features/admin/coupons/coupon-detail-client";

export const dynamic = "force-dynamic";

type Params = Promise<{ couponId: string }>;

export default async function AdminCouponDetailPage({ params }: { params: Params }) {
  const { couponId } = await params;

  let coupon: Awaited<ReturnType<typeof findCoupon>>;
  try {
    coupon = await findCoupon(couponId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 py-10 md:px-8">
        <PageHeader
          title="无法加载优惠码"
          crumbs={[{ label: "交易" }, { label: "优惠码", href: "/admin/coupons" }]}
        />
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">数据库不可达：{msg}</p>
        </div>
      </div>
    );
  }
  if (!coupon) notFound();

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title={coupon.codeNormalized}
        crumbs={[
          { label: "交易" },
          { label: "优惠码", href: "/admin/coupons" },
          { label: coupon.codeNormalized },
        ]}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={coupon.active ? "success" : "neutral"}>
              {coupon.active ? "启用" : "停用"}
            </Badge>
            <span className="text-[#48484A]">
              {coupon.type === "percent_off"
                ? `${coupon.value}% off`
                : `减 ¥${(coupon.value / 100).toFixed(2)}`}
            </span>
            <span className="text-[#48484A]">·</span>
            <span className="text-[#48484A]">
              已用 {coupon.redemptionCount} / {coupon.maxRedemptions ?? "∞"}
            </span>
          </div>
        }
      />

      <CouponDetailClient
        coupon={{
          id: coupon.id,
          code: coupon.codeNormalized,
          type: coupon.type,
          value: coupon.value,
          scope: coupon.scope,
          testName: coupon.test?.name ?? null,
          minAmount: coupon.minAmount,
          maxRedemptions: coupon.maxRedemptions,
          redemptionCount: coupon.redemptionCount,
          perUserLimit: coupon.perUserLimit,
          startsAt: coupon.startsAt?.toISOString() ?? null,
          expiresAt: coupon.expiresAt?.toISOString() ?? null,
          active: coupon.active,
          note: coupon.note,
          createdAt: coupon.createdAt.toISOString(),
          uses: coupon.uses.map((u) => ({
            id: u.id,
            orderId: u.orderId,
            userId: u.userId,
            discount: u.discount,
            createdAt: u.createdAt.toISOString(),
          })),
        }}
      />
    </div>
  );
}

async function findCoupon(couponId: string) {
  return prisma.coupon.findUnique({
    where: { id: couponId },
    include: {
      test: { select: { name: true, slug: true } },
      uses: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          orderId: true,
          userId: true,
          discount: true,
          createdAt: true,
        },
      },
    },
  });
}
