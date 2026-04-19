import Link from "next/link";

import { PageHeader } from "@/features/admin/ui/page-header";
import { StatCard } from "@/features/admin/ui/stat-card";
import { Badge } from "@/features/admin/ui/badge";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  let data: Awaited<ReturnType<typeof fetchOverview>> | null = null;
  let dbError: string | null = null;

  try {
    data = await fetchOverview();
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="分析概览"
        description="平台关键指标概览。漏斗数据查询 PostHog；注册事件和保存的漏斗配置存在本地 DB。"
        crumbs={[{ label: "分析" }, { label: "概览" }]}
      />

      {dbError ? (
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">数据库不可达：{dbError}</p>
        </div>
      ) : data ? (
        <>
          {/* 核心指标卡 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="总用户" value={data.userCount.toLocaleString()} />
            <StatCard label="总报告" value={data.reportCount.toLocaleString()} />
            <StatCard label="总订单" value={data.orderCount.toLocaleString()} />
            <StatCard
              label="付费转化"
              value={data.reportCount > 0 ? `${((data.paidCount / data.reportCount) * 100).toFixed(1)}%` : "—"}
              hint={`${data.paidCount} 份已解锁`}
            />
          </div>

          {/* 置顶漏斗 */}
          {data.pinnedFunnels.length > 0 && (
            <section>
              <h2 className="mb-3 text-[13px] font-semibold text-[#8E8E93]">置顶漏斗</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {data.pinnedFunnels.map((f) => {
                  const steps = Array.isArray(f.steps) ? f.steps : [];
                  return (
                    <div key={f.id} className="rounded-2xl bg-[#111118] p-5 ring-1 ring-[#1A1A24]">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[14px] font-semibold text-[#F5F5F7]">{f.name}</span>
                        <Link href="/admin/analytics/funnels" className="text-[11.5px] text-[#7C5CFC] hover:underline">
                          编辑 →
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {steps.map((s, i) => (
                          <span key={i} className="flex items-center gap-1 text-[11.5px] text-[#8E8E93]">
                            {i > 0 && <span className="text-[#2A2A36]">→</span>}
                            <span className="rounded-lg bg-[#1A1A24] px-2 py-0.5 font-mono">{(s as { eventName?: string }).eventName ?? "?"}</span>
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-[#48484A]">{steps.length} 步 · 时间窗 {f.windowHours}h</p>
                      <div className="mt-3 rounded-xl bg-[rgba(124,92,252,0.06)] px-3.5 py-2.5 text-[12px] text-[#8E8E93] ring-1 ring-[rgba(124,92,252,0.12)]">
                        PostHog 查询接口待配置（需设置 <code className="font-mono text-[#C4B5FC]">POSTHOG_PROJECT_ID</code> 和 <code className="font-mono text-[#C4B5FC]">POSTHOG_PERSONAL_API_KEY</code>）
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 事件注册表摘要 */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#8E8E93]">已注册事件（{data.events.length}）</h2>
              <Link href="/admin/analytics/events" className="text-[12px] text-[#7C5CFC] hover:underline">
                管理事件 →
              </Link>
            </div>
            {data.events.length === 0 ? (
              <div className="rounded-2xl bg-[#111118] p-6 text-center ring-1 ring-[#1A1A24]">
                <p className="text-[13px] text-[#48484A]">
                  尚未注册事件。{" "}
                  <Link href="/admin/analytics/events" className="text-[#7C5CFC] hover:underline">
                    去注册 →
                  </Link>
                </p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.events.slice(0, 9).map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl bg-[#111118] px-4 py-3 ring-1 ring-[#1A1A24]">
                    <div>
                      <p className="font-mono text-[12.5px] text-[#F5F5F7]">{e.name}</p>
                      <p className="text-[11px] text-[#48484A]">{e.displayName}</p>
                    </div>
                    <Badge tone="neutral">{e.category}</Badge>
                  </div>
                ))}
                {data.events.length > 9 && (
                  <Link
                    href="/admin/analytics/events"
                    className="flex items-center justify-center rounded-xl bg-[#111118] px-4 py-3 text-[12px] text-[#7C5CFC] ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]"
                  >
                    +{data.events.length - 9} 更多 →
                  </Link>
                )}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

async function fetchOverview() {
  const [userCount, reportCount, paidCount, orderCount, pinnedFunnels, events] = await Promise.all([
    prisma.user.count(),
    prisma.report.count(),
    prisma.report.count({ where: { isPremiumLocked: false } }),
    prisma.order.count(),
    prisma.analyticsFunnel.findMany({ where: { pinned: true }, orderBy: { updatedAt: "desc" }, take: 4 }),
    prisma.trackedEvent.findMany({ where: { status: "active" }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);

  return { userCount, reportCount, paidCount, orderCount, pinnedFunnels, events };
}
