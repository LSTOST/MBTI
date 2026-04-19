import { notFound } from "next/navigation";

import { PageHeader } from "@/features/admin/ui/page-header";
import { Badge, type BadgeTone } from "@/features/admin/ui/badge";
import { prisma } from "@/lib/db";
import { listReportStrategies, validateScoringConfig } from "@/lib/test-strategy";
import { TestTabsBar } from "@/features/admin/tests/test-tabs-bar";
import { ScoringConfigClient } from "@/features/admin/tests/scoring-config-client";

export const dynamic = "force-dynamic";

type Params = Promise<{ testId: string }>;

export default async function AdminTestScoringPage({ params }: { params: Params }) {
  const { testId } = await params;

  let data: Awaited<ReturnType<typeof findTest>>;
  try {
    data = await findTest(testId);
  } catch (err) {
    return <DbDownFallback testId={testId} error={err} />;
  }
  if (!data) notFound();

  const strategies = listReportStrategies();
  const validation = validateScoringConfig(data.reportStrategy, data.scoringConfig);
  const tone = statusTone(data.status);

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title={data.name}
        description="设置计分策略的参数配置（scoringConfig）。发布时会按照策略 Schema 自动校验。"
        crumbs={[
          { label: "内容" },
          { label: "测试管理", href: "/admin/tests" },
          { label: data.name, href: `/admin/tests/${data.id}` },
          { label: "计分" },
        ]}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <Badge tone={tone}>{statusLabel(data.status)}</Badge>
            <span className="font-mono text-[#48484A]">/{data.slug}</span>
            <span className="text-[#48484A]">·</span>
            {validation.ok ? (
              <span className="text-[#30D158]">✓ 配置有效</span>
            ) : (
              <span className="text-[#FF9F0A]">
                ⚠ {validation.errors.length} 个问题待修复
              </span>
            )}
          </div>
        }
      />

      <TestTabsBar testId={data.id} active="scoring" />

      <ScoringConfigClient
        testId={data.id}
        reportStrategy={data.reportStrategy}
        scoringConfig={data.scoringConfig as Record<string, unknown>}
        strategies={strategies.map((s) => ({
          id: s.id,
          displayName: s.displayName,
          description: s.description,
        }))}
        initialValidation={validation}
      />
    </div>
  );
}

async function findTest(testId: string) {
  return prisma.testTemplate.findUnique({
    where: { id: testId },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      reportStrategy: true,
      scoringConfig: true,
    },
  });
}

function DbDownFallback({ testId, error }: { testId: string; error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 py-10 md:px-8">
      <PageHeader
        title="无法加载计分配置"
        crumbs={[{ label: "内容" }, { label: "测试管理", href: "/admin/tests" }, { label: "计分" }]}
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
