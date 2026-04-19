import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/features/admin/ui/page-header";
import { Badge, type BadgeTone } from "@/features/admin/ui/badge";
import { prisma } from "@/lib/db";
import { OrderDetailClient } from "@/features/admin/orders/order-detail-client";

export const dynamic = "force-dynamic";

type Params = Promise<{ orderId: string }>;

export default async function AdminOrderDetailPage({ params }: { params: Params }) {
  const { orderId } = await params;

  let order: Awaited<ReturnType<typeof findOrder>>;
  try {
    order = await findOrder(orderId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 py-10 md:px-8">
        <PageHeader
          title="无法加载订单"
          crumbs={[{ label: "交易" }, { label: "订单", href: "/admin/orders" }]}
        />
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">数据库不可达：{msg}</p>
        </div>
      </div>
    );
  }
  if (!order) notFound();

  const tone = orderTone(order.status);

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title={`订单 ${order.id.slice(0, 12)}…`}
        crumbs={[
          { label: "交易" },
          { label: "订单", href: "/admin/orders" },
          { label: order.id.slice(0, 12) },
        ]}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone}>{orderLabel(order.status)}</Badge>
            <span className="text-[#48484A]">{channelLabel(order.paymentChannel)}</span>
          </div>
        }
      />

      {/* 金额卡 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-[#111118] p-4 ring-1 ring-[#1A1A24]">
          <p className="text-[11px] text-[#48484A]">实付金额</p>
          <p className="mt-1 text-[22px] font-semibold text-[#F5F5F7]">
            ¥{(order.amount / 100).toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#111118] p-4 ring-1 ring-[#1A1A24]">
          <p className="text-[11px] text-[#48484A]">原价</p>
          <p className="mt-1 text-[22px] font-semibold text-[#F5F5F7]">
            ¥{((order.originalAmount ?? order.amount) / 100).toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#111118] p-4 ring-1 ring-[#1A1A24]">
          <p className="text-[11px] text-[#48484A]">优惠抵扣</p>
          <p className={`mt-1 text-[22px] font-semibold ${order.discountAmount > 0 ? "text-[#30D158]" : "text-[#48484A]"}`}>
            {order.discountAmount > 0 ? `-¥${(order.discountAmount / 100).toFixed(2)}` : "—"}
          </p>
        </div>
      </div>

      {/* 详情字段 */}
      <div className="flex flex-col divide-y divide-[#1A1A24] rounded-2xl bg-[#111118] ring-1 ring-[#1A1A24]">
        <Row label="订单 ID">
          <code className="font-mono text-[12.5px]">{order.id}</code>
        </Row>
        {order.thirdPartyOrderId && (
          <Row label="第三方单号">
            <code className="font-mono text-[12.5px]">{order.thirdPartyOrderId}</code>
          </Row>
        )}
        <Row label="关联报告">
          {order.report ? (
            <Link
              href={`/report/${order.report.slug}`}
              target="_blank"
              className="font-mono text-[12.5px] text-[#7C5CFC] hover:underline"
            >
              {order.report.mbtiType ?? order.report.slug}
            </Link>
          ) : "—"}
        </Row>
        {order.coupon && (
          <Row label="优惠码">
            <Link
              href={`/admin/coupons/${order.coupon.id}`}
              className="font-mono text-[12.5px] text-[#7C5CFC] hover:underline"
            >
              {order.coupon.codeNormalized}
            </Link>
          </Row>
        )}
        <Row label="创建时间">{new Date(order.createdAt).toLocaleString("zh-CN")}</Row>
        <Row label="支付时间">
          {order.paidAt ? new Date(order.paidAt).toLocaleString("zh-CN") : "—"}
        </Row>
        <Row label="过期时间">
          {order.expiredAt ? new Date(order.expiredAt).toLocaleString("zh-CN") : "—"}
        </Row>
      </div>

      <OrderDetailClient
        orderId={order.id}
        status={order.status}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-[12px] text-[#8E8E93]">{label}</span>
      <span className="text-right text-[13px] text-[#F5F5F7]">{children}</span>
    </div>
  );
}

async function findOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      report: { select: { id: true, slug: true, mbtiType: true } },
      coupon: { select: { id: true, codeNormalized: true } },
    },
  });
}

function orderTone(status: string): BadgeTone {
  if (status === "paid" || status === "fulfilled") return "success";
  if (status === "created" || status === "paying") return "warning";
  return "neutral";
}

function orderLabel(status: string) {
  const map: Record<string, string> = {
    created: "待支付", paying: "支付中", paid: "已支付",
    fulfilled: "已完成", expired: "已过期", failed: "失败",
  };
  return map[status] ?? status;
}

function channelLabel(channel: string) {
  const map: Record<string, string> = {
    wechat_jsapi: "微信 JSAPI", wechat_h5: "微信 H5",
    alipay_h5: "支付宝 H5", mock: "模拟支付", redeem: "兑换码",
  };
  return map[channel] ?? channel;
}
