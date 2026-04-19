import Link from "next/link";
import { Download } from "lucide-react";

import { PageHeader } from "@/features/admin/ui/page-header";
import { Badge, type BadgeTone } from "@/features/admin/ui/badge";
import { EmptyState } from "@/features/admin/ui/empty-state";
import { prisma } from "@/lib/db";
import { NewCouponButton } from "@/features/admin/coupons/new-coupon-button";
import { CouponActions } from "@/features/admin/coupons/coupon-actions";
import { CopyButton } from "@/features/admin/ui/copy-button";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ active?: string; page?: string }>;

export default async function AdminCouponsPage({ searchParams }: { searchParams: SearchParams }) {
  const { active: rawActive = "", page: rawPage = "1" } = await searchParams;
  const activeFilter = rawActive === "1" ? true : rawActive === "0" ? false : null;
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const pageSize = 50;

  let items: Awaited<ReturnType<typeof fetchCoupons>>["items"] = [];
  let total = 0;
  let dbError: string | null = null;

  try {
    ({ items, total } = await fetchCoupons(activeFilter, page, pageSize));
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="优惠码"
        description="管理支付流程内的折扣码。用户下单时可输入优惠码享受金额抵扣。"
        crumbs={[{ label: "交易" }, { label: "优惠码" }]}
        primaryAction={
          !dbError ? (
            <div className="flex items-center gap-2">
              <a
                href="/api/admin/coupons/export.csv"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1A1A24] px-4 text-[14px] font-medium text-[#8E8E93] ring-1 ring-[#2A2A36] transition-colors hover:bg-[#22222e] hover:text-[#F5F5F7]"
              >
                <Download className="h-4 w-4" strokeWidth={2} />
                导出 CSV
              </a>
              <NewCouponButton />
            </div>
          ) : undefined
        }
        meta={dbError ? <span className="text-[#FF453A]">⚠ DB 连接失败</span> : undefined}
      />

      {dbError ? (
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">数据库不可达：{dbError}</p>
        </div>
      ) : (
        <>
          {/* 过滤 */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "全部", href: "/admin/coupons" },
              { label: "启用中", href: "/admin/coupons?active=1" },
              { label: "已停用", href: "/admin/coupons?active=0" },
            ].map((f) => {
              const isCurrent =
                f.href === "/admin/coupons"
                  ? activeFilter === null
                  : f.href.includes("active=1")
                    ? activeFilter === true
                    : activeFilter === false;
              return (
                <Link
                  key={f.href}
                  href={f.href}
                  className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${
                    isCurrent
                      ? "bg-[#7C5CFC] text-[#F5F5F7]"
                      : "bg-[#111118] text-[#8E8E93] hover:text-[#F5F5F7] ring-1 ring-[#1A1A24]"
                  }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="暂无优惠码"
              description="点击右上角「新建优惠码」创建第一张。"
              action={<NewCouponButton />}
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl ring-1 ring-[#1A1A24]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#1A1A24] text-left text-[11px] uppercase tracking-[0.14em] text-[#48484A]">
                    <th className="px-4 py-3">码</th>
                    <th className="px-4 py-3">类型</th>
                    <th className="px-4 py-3">折扣</th>
                    <th className="px-4 py-3">范围</th>
                    <th className="px-4 py-3 text-right">已用/上限</th>
                    <th className="px-4 py-3">到期</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A24]">
                  {items.map((c) => (
                    <tr key={c.id} className="hover:bg-[#111118]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/coupons/${c.id}`}
                            className="font-mono text-[12.5px] font-medium text-[#7C5CFC] hover:underline"
                          >
                            {c.code}
                          </Link>
                          <CopyButton text={c.code} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#8E8E93]">
                        {c.type === "percent_off" ? "百分比" : "固定额"}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#F5F5F7]">
                        {c.type === "percent_off"
                          ? `${c.value}% off`
                          : `减 ¥${(c.value / 100).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 text-[#8E8E93]">
                        {c.scope === "global" ? "全站" : c.testName ?? "指定测试"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#8E8E93]">
                        {c.redemptionCount} / {c.maxRedemptions ?? "∞"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#48484A]">
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleDateString("zh-CN")
                          : "永久"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={c.active ? "success" : "neutral"}>
                          {c.active ? "启用" : "停用"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <CouponActions
                            id={c.id}
                            code={c.code}
                            active={c.active}
                            hasUses={c.redemptionCount > 0}
                          />
                        </div>
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
                  href={`/admin/coupons?page=${page - 1}`}
                  className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]"
                >
                  上一页
                </Link>
              )}
              <span className="text-[#48484A]">第 {page} 页 · 共 {total} 条</span>
              {page * pageSize < total && (
                <Link
                  href={`/admin/coupons?page=${page + 1}`}
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

async function fetchCoupons(active: boolean | null, page: number, pageSize: number) {
  const where: Record<string, unknown> = {};
  if (active !== null) where.active = active;
  const [rows, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        test: { select: { name: true } },
        _count: { select: { uses: true } },
      },
    }),
    prisma.coupon.count({ where }),
  ]);
  return {
    items: rows.map((c) => ({
      id: c.id,
      code: c.codeNormalized,
      type: c.type,
      value: c.value,
      scope: c.scope,
      testName: c.test?.name ?? null,
      minAmount: c.minAmount,
      maxRedemptions: c.maxRedemptions,
      redemptionCount: c.redemptionCount,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      active: c.active,
    })),
    total,
  };
}
