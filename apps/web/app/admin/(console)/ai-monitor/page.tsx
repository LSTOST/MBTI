import Link from "next/link";

import { PageHeader } from "@/features/admin/ui/page-header";
import { StatCard } from "@/features/admin/ui/stat-card";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; page?: string }>;

export default async function AdminAiMonitorPage({ searchParams }: { searchParams: SearchParams }) {
  const { status: statusFilter, page: rawPage = "1" } = await searchParams;
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const pageSize = 30;

  let stats: Awaited<ReturnType<typeof fetchStats>> | null = null;
  let items: Awaited<ReturnType<typeof fetchItems>>["items"] = [];
  let total = 0;
  let dbError: string | null = null;

  try {
    [stats, { items, total }] = await Promise.all([
      fetchStats(),
      fetchItems({ status: statusFilter, page, pageSize }),
    ]);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="AI 监控"
        description="AI 深度报告的生成健康度：成功率、平均延迟、失败原因分布。"
        crumbs={[{ label: "系统" }, { label: "AI 监控" }]}
      />

      {dbError ? (
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">数据库不可达：{dbError}</p>
        </div>
      ) : stats ? (
        <>
          {/* 统计卡 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="总任务" value={stats.total.toString()} />
            <StatCard
              label="成功"
              value={stats.done.toString()}
              hint={stats.total > 0 ? `${((stats.done / stats.total) * 100).toFixed(1)}%` : undefined}
            />
            <StatCard label="失败" value={stats.failed.toString()} />
            <StatCard
              label="平均延迟"
              value={stats.avgLatency !== null ? `${(stats.avgLatency / 1000).toFixed(1)}s` : "—"}
            />
          </div>

          {/* 状态过滤 */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "全部", value: "" },
              { label: "排队中", value: "not_started" },
              { label: "处理中", value: "processing" },
              { label: "已完成", value: "completed" },
              { label: "失败", value: "failed" },
            ].map((opt) => (
              <Link
                key={opt.value}
                href={`/admin/ai-monitor?status=${opt.value}`}
                className={`rounded-xl px-3 py-1.5 text-[12px] font-medium ${(statusFilter ?? "") === opt.value ? "bg-[rgba(124,92,252,0.14)] text-[#C4B5FC]" : "text-[#8E8E93] hover:bg-[#1A1A24]"}`}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          <div className="rounded-2xl bg-[#111118] ring-1 ring-[#1A1A24]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A1A24]">
                  {["Report ID", "状态", "模型", "延迟", "重试", "失败原因", "时间"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-[#48484A]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-[#48484A]">
                      暂无记录
                    </td>
                  </tr>
                ) : (
                  items.map((a) => (
                    <tr key={a.id} className="border-b border-[#1A1A24] last:border-0">
                      <td className="px-5 py-3">
                        <Link
                          href={`/report/${a.reportSlug}`}
                          target="_blank"
                          className="font-mono text-[11px] text-[#7C5CFC] hover:underline"
                        >
                          {a.reportId.slice(0, 12)}…
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <AiStatusBadge status={a.status} />
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-[#8E8E93]">{a.model ?? "—"}</td>
                      <td className="px-5 py-3 text-[12px] text-[#8E8E93]">
                        {a.latencyMs !== null ? `${(a.latencyMs / 1000).toFixed(1)}s` : "—"}
                      </td>
                      <td className="px-5 py-3 text-[12px] text-[#8E8E93]">{a.retryCount}</td>
                      <td className="px-5 py-3 max-w-[200px]">
                        {a.failureReason ? (
                          <span className="line-clamp-2 text-[11.5px] text-[#FF453A]">{a.failureReason}</span>
                        ) : (
                          <span className="text-[11.5px] text-[#2A2A36]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[11px] text-[#48484A] whitespace-nowrap">
                        {new Date(a.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > pageSize && (
            <div className="flex items-center justify-center gap-3 text-[13px]">
              {page > 1 && (
                <Link
                  href={`/admin/ai-monitor?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}`}
                  className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]"
                >
                  上一页
                </Link>
              )}
              <span className="text-[#48484A]">第 {page} 页 · 共 {total} 条</span>
              {page * pageSize < total && (
                <Link
                  href={`/admin/ai-monitor?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}`}
                  className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]"
                >
                  下一页
                </Link>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function AiStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    not_started: { label: "排队中", color: "text-[#8E8E93]" },
    processing: { label: "处理中", color: "text-[#FF9F0A]" },
    completed: { label: "已完成", color: "text-[#30D158]" },
    failed: { label: "失败", color: "text-[#FF453A]" },
  };
  const c = cfg[status] ?? { label: status, color: "text-[#48484A]" };
  return <span className={`text-[12px] font-medium ${c.color}`}>{c.label}</span>;
}

async function fetchStats() {
  const [total, done, failed, latencyAgg] = await Promise.all([
    prisma.aiReport.count(),
    prisma.aiReport.count({ where: { status: "completed" } }),
    prisma.aiReport.count({ where: { status: "failed" } }),
    prisma.aiReport.aggregate({
      where: { status: "completed", latencyMs: { not: null } },
      _avg: { latencyMs: true },
    }),
  ]);
  return { total, done, failed, avgLatency: latencyAgg._avg.latencyMs ?? null };
}

async function fetchItems({
  status,
  page,
  pageSize,
}: {
  status?: string;
  page: number;
  pageSize: number;
}) {
  const where = status ? { status: status as never } : {};
  const [rows, total] = await Promise.all([
    prisma.aiReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        reportId: true,
        report: { select: { slug: true } },
        status: true,
        model: true,
        latencyMs: true,
        retryCount: true,
        failureReason: true,
        createdAt: true,
      },
    }),
    prisma.aiReport.count({ where }),
  ]);

  return {
    items: rows.map((a) => ({
      id: a.id,
      reportId: a.reportId,
      reportSlug: a.report.slug,
      status: a.status as string,
      model: a.model,
      latencyMs: a.latencyMs,
      retryCount: a.retryCount,
      failureReason: a.failureReason,
      createdAt: a.createdAt.toISOString(),
    })),
    total,
  };
}
