import { PageHeader } from "@/features/admin/ui/page-header";
import { EmptyState } from "@/features/admin/ui/empty-state";
import { Badge } from "@/features/admin/ui/badge";
import { prisma } from "@/lib/db";
import { FunnelsNewButton, FunnelsActions } from "@/features/admin/analytics/funnels-client";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsFunnelsPage() {
  let items: Awaited<ReturnType<typeof fetchFunnels>> = [];
  let dbError: string | null = null;

  try {
    items = await fetchFunnels();
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="漏斗"
        description="可视化构建多步漏斗，保存后可在 Dashboard 置顶展示。查询走 PostHog HogQL API。"
        crumbs={[{ label: "分析" }, { label: "漏斗" }]}
        primaryAction={!dbError ? <FunnelsNewButton /> : undefined}
      />

      {dbError ? (
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">数据库不可达：{dbError}</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="尚无漏斗"
          description="点击「新建漏斗」，配置 2–10 步转化链路，保存后可置顶到 Dashboard。"
          action={<FunnelsNewButton />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((f) => {
            const steps = Array.isArray(f.steps) ? f.steps : [];
            return (
              <article
                key={f.id}
                className="flex flex-col gap-3 rounded-2xl bg-[#111118] p-5 ring-1 ring-[#1A1A24] hover:ring-[#2A2A34] transition"
              >
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[15px] font-semibold text-[#F5F5F7]">{f.name}</h2>
                      {f.pinned && <Badge tone="accent">置顶</Badge>}
                    </div>
                    {f.description && (
                      <p className="mt-0.5 text-[12px] text-[#8E8E93]">{f.description}</p>
                    )}
                  </div>
                  <FunnelsActions funnel={f} />
                </header>

                <div className="flex flex-wrap gap-1">
                  {steps.map((s, i) => (
                    <span key={i} className="flex items-center gap-1 text-[11.5px] text-[#8E8E93]">
                      {i > 0 && <span className="text-[#2A2A36]">→</span>}
                      <span className="rounded-lg bg-[#1A1A24] px-2 py-0.5 font-mono">{(s as { eventName?: string }).eventName ?? "?"}</span>
                    </span>
                  ))}
                </div>

                <p className="text-[11px] text-[#48484A]">
                  {steps.length} 步 · 时间窗 {f.windowHours}h · 更新 {new Date(f.updatedAt).toLocaleDateString("zh-CN")}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function fetchFunnels() {
  return prisma.analyticsFunnel.findMany({
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
}
