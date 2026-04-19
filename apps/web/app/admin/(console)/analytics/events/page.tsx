import { PageHeader } from "@/features/admin/ui/page-header";
import { EmptyState } from "@/features/admin/ui/empty-state";
import { Badge } from "@/features/admin/ui/badge";
import { prisma } from "@/lib/db";
import { EventsNewButton, EventsActions } from "@/features/admin/analytics/events-client";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsEventsPage() {
  let items: Awaited<ReturnType<typeof fetchEvents>> = [];
  let dbError: string | null = null;

  try {
    items = await fetchEvents();
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  // Derive categories for filter
  const categories = [...new Set(items.map((e) => e.category))].sort();

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="事件注册表"
        description="埋点事件元信息中心。供漏斗构建时下拉选择，文档页展示字段说明。真实事件数据在 PostHog。"
        crumbs={[{ label: "分析" }, { label: "事件" }]}
        primaryAction={!dbError ? <EventsNewButton /> : undefined}
      />

      {dbError ? (
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">数据库不可达：{dbError}</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="尚未注册事件"
          description="点击「新建事件」，为埋点事件添加元信息和字段文档。"
          action={<EventsNewButton />}
        />
      ) : (
        <div className="rounded-2xl bg-[#111118] ring-1 ring-[#1A1A24]">
          {/* 分组展示 */}
          {categories.map((cat) => {
            const catItems = items.filter((e) => e.category === cat);
            return (
              <section key={cat}>
                <div className="border-b border-[#1A1A24] px-5 py-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#48484A]">
                    {cat}
                  </span>
                </div>
                {catItems.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-start justify-between gap-4 border-b border-[#1A1A24] px-5 py-4 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] text-[#F5F5F7]">{e.name}</span>
                        <Badge tone={e.status === "active" ? "success" : "neutral"}>
                          {e.status === "active" ? "启用" : "已废弃"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[12px] text-[#8E8E93]">{e.displayName}</p>
                      {e.description && (
                        <p className="mt-1 text-[12px] text-[#48484A]">{e.description}</p>
                      )}
                      <p className="mt-1 text-[11px] text-[#48484A]">
                        {Array.isArray(e.properties) ? e.properties.length : 0} 个属性字段
                      </p>
                    </div>
                    <EventsActions event={e} />
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function fetchEvents() {
  return prisma.trackedEvent.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      displayName: true,
      category: true,
      description: true,
      properties: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
