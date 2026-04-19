import Link from "next/link";

import { PageHeader } from "@/features/admin/ui/page-header";
import { StatCard } from "@/features/admin/ui/stat-card";
import { Badge, type BadgeTone } from "@/features/admin/ui/badge";
import { EmptyState } from "@/features/admin/ui/empty-state";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; page?: string }>;

const STATUS_FILTERS = [
  { id: "all", label: "全部" },
  { id: "paid", label: "已支付" },
  { id: "fulfilled", label: "已完成" },
  { id: "created", label: "待支付" },
  { id: "expired", label: "已过期" },
  { id: "failed", label: "失败" },
] as const;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { status: rawStatus = "all", page: rawPage = "1" } = await searchParams;
  const status = STATUS_FILTERS.some((f) => f.id === rawStatus) ? rawStatus : "all";
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const pageSize = 50;

  let items: { id: string; status: string; amount: number; discountAmount: number; paymentChannel: string; createdAt: string; report: { id: string; slug: string; mbtiType: string | null } | null }[] = [];
  let total = 0;
  let stats = { paid: 0, total: 0, revenue: 0 };
  let dbError: string | null = null;

  try {
    [{ items, total }, stats] = await Promise.all([
      fetchOrders(status, page, pageSize),
      fetchStats(),
    ]);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const qs = status === "all" ? "" : `status=${status}&`;

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="订单管理"
        description="查看用户支付记录。手工标记已付请进入订单详情操作。"
        crumbs={[{ label: "交易" }, { label: "订单" }]}
        meta={dbError ? <span className="text-[#FF453A]">⚠ DB 连接失败</span> : undefined}
      />

      <section aria-label="总览" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="总订单" value={stats.total} />
        <StatCard label="已支付/完成" value={stats.paid} />
        <StatCard label="总收入" value={`¥${(stats.revenue / 100).toFixed(2)}`} />
        <StatCard label="本页显示" value={items.length} />
      </section>

      {dbError ? (
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">
            数据库不可达。请确认 Postgres 已启动并刷新本页。
          </p>
          <p className="mt-2 font-mono text-[11px] text-[#48484A]">{dbError}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <Link
                key={f.id}
                href={f.id === "all" ? "/admin/orders" : `/admin/orders?status=${f.id}`}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${
                  status === f.id
                    ? "bg-[#7C5CFC] text-[#F5F5F7]"
                    : "bg-[#111118] text-[#8E8E93] hover:text-[#F5F5F7] ring-1 ring-[#1A1A24]"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          {items.length === 0 ? (
            <EmptyState title="暂无订单" description="此状态下没有订单记录。" />
          ) : (
            <div className="overflow-x-auto rounded-2xl ring-1 ring-[#1A1A24]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#1A1A24] text-left text-[11px] uppercase tracking-[0.14em] text-[#48484A]">
                    <th className="px-4 py-3">订单 ID</th>
                    <th className="px-4 py-3">MBTI</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3 text-right">实付</th>
                    <th className="px-4 py-3">渠道</th>
                    <th className="px-4 py-3">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A24]">
                  {items.map((o) => (
                    <tr key={o.id} className="hover:bg-[#111118]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-mono text-[11.5px] text-[#7C5CFC] hover:underline"
                        >
                          {o.id.slice(0, 12)}…
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-[#8E8E93]">
                        {o.report?.mbtiType ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={orderTone(o.status)}>{orderLabel(o.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="text-[#F5F5F7]">¥{(o.amount / 100).toFixed(2)}</span>
                        {o.discountAmount > 0 && (
                          <span className="ml-1 text-[10.5px] text-[#30D158]">
                            -{(o.discountAmount / 100).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#48484A]">{channelLabel(o.paymentChannel)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#48484A]">
                        {new Date(o.createdAt).toLocaleString("zh-CN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > pageSize && (
            <div className="flex items-center justify-center gap-3 text-[13px]">
              {page > 1 && (
                <Link
                  href={`/admin/orders?${qs}page=${page - 1}`}
                  className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]"
                >
                  上一页
                </Link>
              )}
              <span className="text-[#48484A]">第 {page} 页 · 共 {total} 条</span>
              {page * pageSize < total && (
                <Link
                  href={`/admin/orders?${qs}page=${page + 1}`}
                  className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]"
                >
                  下一页
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

async function fetchOrders(status: string, page: number, pageSize: number) {
  const where = status === "all" ? {} : { status: status as never };
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        amount: true,
        discountAmount: true,
        paymentChannel: true,
        createdAt: true,
        reportId: true,
        report: { select: { id: true, slug: true, mbtiType: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return {
    items: rows.map((o) => ({
      id: o.id,
      status: o.status,
      amount: o.amount,
      discountAmount: o.discountAmount,
      paymentChannel: o.paymentChannel,
      createdAt: o.createdAt.toISOString(),
      report: o.report,
    })),
    total,
  };
}

async function fetchStats() {
  const [groups, total] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { amount: true },
      where: { status: { in: ["paid", "fulfilled"] } },
    }),
    prisma.order.count(),
  ]);
  const paidRevenue = groups.reduce((sum, g) => sum + (g._sum.amount ?? 0), 0);
  const paidCount = groups.reduce((sum, g) => sum + g._count._all, 0);
  return { paid: paidCount, total, revenue: paidRevenue };
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
