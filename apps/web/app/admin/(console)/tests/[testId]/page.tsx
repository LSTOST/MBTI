import { notFound } from "next/navigation";

import { PageHeader } from "@/features/admin/ui/page-header";
import { Badge, type BadgeTone } from "@/features/admin/ui/badge";
import { prisma } from "@/lib/db";
import { getReportStrategy, listReportStrategies } from "@/lib/test-strategy";
import { TestDetailClient } from "@/features/admin/tests/test-detail-client";
import { TestTabsBar } from "@/features/admin/tests/test-tabs-bar";

export const dynamic = "force-dynamic";

type Params = Promise<{ testId: string }>;

export default async function AdminTestDetailPage({ params }: { params: Params }) {
  const { testId } = await params;

  let row: Awaited<ReturnType<typeof findTest>>;
  try {
    row = await findTest(testId);
  } catch (err) {
    return <DbDownFallback testId={testId} error={err} />;
  }
  if (!row) notFound();

  const strategy = getReportStrategy(row.reportStrategy);
  const strategies = listReportStrategies();
  const tone = statusTone(row.status);

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title={row.name}
        description={row.tagline ?? undefined}
        crumbs={[
          { label: "内容" },
          { label: "测试管理", href: "/admin/tests" },
          { label: row.name },
        ]}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <Badge tone={tone}>{statusLabel(row.status)}</Badge>
            <span className="font-mono text-[#48484A]">/{row.slug}</span>
            <span className="text-[#48484A]">·</span>
            <span className="text-[#48484A]">
              策略：{strategy?.displayName ?? `${row.reportStrategy}（未注册）`}
            </span>
          </div>
        }
      />

      <TestTabsBar testId={row.id} active="overview" />

      <TestDetailClient
        test={{
          id: row.id,
          slug: row.slug,
          name: row.name,
          tagline: row.tagline,
          description: row.description,
          coverImage: row.coverImage,
          status: row.status,
          accessMode: row.accessMode,
          pricingMode: row.pricingMode,
          basePrice: row.basePrice,
          aiPrice: row.aiPrice,
          reportStrategy: row.reportStrategy,
          sortOrder: row.sortOrder,
          publishedAt: row.publishedAt?.toISOString() ?? null,
          counts: {
            questions: row._count.questions,
            reports: row._count.reports,
          },
        }}
        strategies={strategies.map((s) => ({
          id: s.id,
          displayName: s.displayName,
          minQuestions: s.minQuestions,
        }))}
      />
    </div>
  );
}

async function findTest(testId: string) {
  return prisma.testTemplate.findUnique({
    where: { id: testId },
    include: {
      _count: { select: { questions: true, reports: true } },
    },
  });
}

function DbDownFallback({ testId, error }: { testId: string; error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 py-10 md:px-8">
      <PageHeader
        title="无法加载测试详情"
        crumbs={[{ label: "内容" }, { label: "测试管理", href: "/admin/tests" }]}
      />
      <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
        <p className="text-[13px] font-medium text-[#FF453A]">
          数据库暂不可达，无法加载 id = <code className="font-mono">{testId}</code>。
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-[#8E8E93]">
          请确认 Postgres 已启动并且 <code className="font-mono">DATABASE_URL</code> 正确，然后刷新本页。
        </p>
        <p className="mt-3 font-mono text-[11px] text-[#48484A]">{msg}</p>
      </div>
    </div>
  );
}

function statusTone(status: string): BadgeTone {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

function statusLabel(status: string) {
  return status === "published" ? "已发布" : status === "draft" ? "草稿" : "已归档";
}
