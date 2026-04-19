import Link from "next/link";

import { PageHeader } from "@/features/admin/ui/page-header";
import { StatCard } from "@/features/admin/ui/stat-card";
import { Badge, type BadgeTone } from "@/features/admin/ui/badge";
import { EmptyState } from "@/features/admin/ui/empty-state";
import { listAllTests, type LoadedTest } from "@/lib/test-loader";
import { getReportStrategy } from "@/lib/test-strategy";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

const STATUS_FILTERS = [
  { id: "all", label: "全部" },
  { id: "published", label: "已发布" },
  { id: "draft", label: "草稿" },
  { id: "archived", label: "已归档" },
] as const;

export default async function AdminTestsPage({ searchParams }: { searchParams: SearchParams }) {
  const { status: rawStatus = "all" } = await searchParams;
  const status = STATUS_FILTERS.some((f) => f.id === rawStatus) ? rawStatus : "all";

  const all = await listAllTests();
  const filtered = status === "all" ? all : all.filter((t) => t.status === status);

  const overview = {
    total: all.length,
    published: all.filter((t) => t.status === "published").length,
    draft: all.filter((t) => t.status === "draft").length,
    archived: all.filter((t) => t.status === "archived").length,
  };

  const usingFallback = all.length > 0 && all.every((t) => t.source === "fallback");

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="测试管理"
        description="维护多测试模板的元信息、题目、计分策略、定价与入口策略。MBTI 为首个已迁入 DB 的模板。"
        crumbs={[{ label: "内容" }, { label: "测试管理" }]}
        meta={
          usingFallback ? (
            <span className="text-[#FF9F0A]">
              ⚠ 当前从硬编码题库回退显示（DB 未连通或未跑 seed）。运行 <code>npm run seed:mbti</code> 后刷新即可切换到 DB 数据。
            </span>
          ) : (
            <>共 {overview.total} 个模板 · 数据源：Prisma</>
          )
        }
        primaryAction={
          !usingFallback ? (
            <Link
              href="/admin/tests/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#7C5CFC] px-4 py-2 text-[13px] font-semibold text-[#F5F5F7] hover:bg-[#8a6dff]"
            >
              + 新建测试
            </Link>
          ) : undefined
        }
      />

      <section aria-label="总览" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="模板总数" value={overview.total} />
        <StatCard label="已发布" value={overview.published} />
        <StatCard label="草稿" value={overview.draft} />
        <StatCard label="已归档" value={overview.archived} />
      </section>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = f.id === status;
          const href = f.id === "all" ? "/admin/tests" : `/admin/tests?status=${f.id}`;
          return (
            <Link
              key={f.id}
              href={href}
              className={
                "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors " +
                (active
                  ? "bg-[rgba(124,92,252,0.2)] text-[#C4B5FC]"
                  : "bg-[#1A1A24] text-[#8E8E93] hover:text-[#F5F5F7]")
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="当前筛选下没有测试"
          description="切换筛选条件查看其他状态的模板，或新建一个测试模板。"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TestCard key={t.id} test={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TestCard({ test }: { test: LoadedTest }) {
  const tone = statusTone(test.status);
  const strategy = getReportStrategy(test.reportStrategy);
  const editable = test.source === "db";

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-[#111118] p-5 ring-1 ring-[#1A1A24]">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-[#F5F5F7]">{test.name}</h2>
          <p className="mt-0.5 font-mono text-[11px] text-[#48484A]">/{test.slug}</p>
        </div>
        <Badge tone={tone}>{statusLabel(test.status)}</Badge>
      </header>

      {test.tagline ? (
        <p className="text-[13px] leading-relaxed text-[#8E8E93]">{test.tagline}</p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
        <Meta label="题数" value={test.questionCount} />
        <Meta label="定价" value={pricingSummary(test)} />
        <Meta label="入口" value={accessLabel(test.accessMode)} />
        <Meta
          label="策略"
          value={strategy ? strategy.displayName : <span className="text-[#FF9F0A]">{test.reportStrategy}（未注册）</span>}
        />
      </dl>

      <footer className="mt-auto flex items-center justify-between border-t border-[#1A1A24] pt-3">
        <span className="text-[11px] text-[#48484A]">
          {test.publishedAt ? `发布于 ${formatDate(test.publishedAt)}` : "未发布"}
        </span>
        {editable ? (
          <Link
            href={`/admin/tests/${test.id}`}
            className="text-[12.5px] font-medium text-[#C4B5FC] hover:text-[#E9E1FF]"
          >
            查看详情 →
          </Link>
        ) : (
          <span className="text-[11px] text-[#48484A]">只读（fallback）</span>
        )}
      </footer>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-medium uppercase tracking-wider text-[#48484A]">{label}</dt>
      <dd className="mt-0.5 truncate text-[12.5px] text-[#E8E8ED]">{value}</dd>
    </div>
  );
}

function statusTone(status: LoadedTest["status"]): BadgeTone {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

function statusLabel(status: LoadedTest["status"]) {
  return status === "published" ? "已发布" : status === "draft" ? "草稿" : "已归档";
}

function accessLabel(m: LoadedTest["accessMode"]) {
  return m === "redeem_required" ? "需兑换码" : "公开";
}

function pricingSummary(t: LoadedTest): string {
  if (t.pricingMode === "free") return "免费";
  const base = formatYuan(t.basePrice);
  if (t.pricingMode === "paid_entry") return `入场 ${base}`;
  // paid_unlock
  if (t.aiPrice) return `解锁 ${base} · AI ${formatYuan(t.aiPrice)}`;
  return `解锁 ${base}`;
}

function formatYuan(fen: number): string {
  if (fen <= 0) return "¥0";
  return `¥${(fen / 100).toFixed(fen % 100 === 0 ? 0 : 2)}`;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  if (y <= 1970) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
