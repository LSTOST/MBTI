import { notFound } from "next/navigation";
import Link from "next/link";

import { PageHeader } from "@/features/admin/ui/page-header";
import { Badge, type BadgeTone } from "@/features/admin/ui/badge";
import { prisma } from "@/lib/db";
import { TestTabsBar } from "@/features/admin/tests/test-tabs-bar";

export const dynamic = "force-dynamic";

type Params = Promise<{ testId: string }>;

export default async function AdminTestPreviewPage({ params }: { params: Params }) {
  const { testId } = await params;

  let data: Awaited<ReturnType<typeof findTest>>;
  try {
    data = await findTest(testId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 py-10 md:px-8">
        <PageHeader
          title="无法加载预览"
          crumbs={[{ label: "内容" }, { label: "测试管理", href: "/admin/tests" }, { label: "预览" }]}
        />
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] font-medium text-[#FF453A]">
            数据库暂不可达，无法加载 id = <code className="font-mono">{testId}</code>。
          </p>
          <p className="mt-3 font-mono text-[11px] text-[#48484A]">{msg}</p>
        </div>
      </div>
    );
  }
  if (!data) notFound();

  const tone = statusTone(data.status);
  const dimensions = [...new Set(data.questions.map((q) => q.dimension).filter(Boolean))];

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title={data.name}
        description="只读预览：题目列表、维度分布及用户端入口。"
        crumbs={[
          { label: "内容" },
          { label: "测试管理", href: "/admin/tests" },
          { label: data.name, href: `/admin/tests/${data.id}` },
          { label: "预览" },
        ]}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <Badge tone={tone}>{statusLabel(data.status)}</Badge>
            <span className="font-mono text-[#48484A]">/{data.slug}</span>
            <span className="text-[#48484A]">·</span>
            <span className="text-[#48484A]">{data.questions.length} 题</span>
            {data.status === "published" && (
              <>
                <span className="text-[#48484A]">·</span>
                <Link
                  href={`/quiz/${data.slug}`}
                  target="_blank"
                  className="text-[#7C5CFC] hover:underline"
                >
                  前端入口 ↗
                </Link>
              </>
            )}
          </div>
        }
      />

      <TestTabsBar testId={data.id} active="preview" />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "总题数", value: data.questions.length },
          { label: "维度数", value: dimensions.length },
          { label: "入场模式", value: data.accessMode === "public" ? "公开" : "兑换码准入" },
          {
            label: "定价模式",
            value:
              data.pricingMode === "free"
                ? "免费"
                : data.pricingMode === "paid_unlock"
                  ? "付费解锁"
                  : "付费进入",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-[#0E0E16] px-4 py-3 ring-1 ring-[#1A1A24]">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#48484A]">{s.label}</p>
            <p className="mt-1 text-[18px] font-semibold text-[#F5F5F7]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Dimensions */}
      {dimensions.length > 0 && (
        <div className="rounded-2xl bg-[#0E0E16] p-5 ring-1 ring-[#1A1A24]">
          <h3 className="mb-3 text-[13px] font-semibold text-[#8E8E93]">维度分布</h3>
          <div className="flex flex-wrap gap-2">
            {dimensions.map((dim) => {
              const count = data.questions.filter((q) => q.dimension === dim).length;
              return (
                <span
                  key={dim}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(124,92,252,0.12)] px-3 py-1 text-[12px] text-[#7C5CFC] ring-1 ring-[rgba(124,92,252,0.3)]"
                >
                  {dim}
                  <span className="text-[11px] text-[#48484A]">{count} 题</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Questions list */}
      <div className="rounded-2xl bg-[#0E0E16] ring-1 ring-[#1A1A24]">
        <div className="border-b border-[#1A1A24] px-5 py-3">
          <h3 className="text-[13px] font-semibold text-[#8E8E93]">题目列表</h3>
        </div>
        {data.questions.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[#48484A]">
            尚无题目，请前往「题目」tab 添加。
          </p>
        ) : (
          <ol className="divide-y divide-[#1A1A24]">
            {data.questions.map((q, i) => {
              const cfg = (q.config ?? {}) as Record<string, unknown>;
              return (
                <li key={q.id} className="flex gap-4 px-5 py-4">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#1A1A24] text-[11px] font-mono text-[#48484A]">
                    {i + 1}
                  </span>
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <p className="text-[13.5px] leading-relaxed text-[#F5F5F7]">{q.prompt}</p>
                    <div className="flex flex-wrap gap-2 text-[11px] text-[#48484A]">
                      {q.dimension && (
                        <span className="rounded-full bg-[#1A1A24] px-2 py-0.5">{q.dimension}</span>
                      )}
                      <span className="rounded-full bg-[#1A1A24] px-2 py-0.5">{q.type}</span>
                      {q.type === "likert_5" && Boolean(cfg.leftPole) && Boolean(cfg.rightPole) && (
                        <span className="rounded-full bg-[#1A1A24] px-2 py-0.5">
                          {String(cfg.leftPole)} ↔ {String(cfg.rightPole)}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
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
      accessMode: true,
      pricingMode: true,
      questions: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          questionKey: true,
          orderIndex: true,
          type: true,
          prompt: true,
          dimension: true,
          config: true,
        },
      },
    },
  });
}

function statusTone(status: string): BadgeTone {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

function statusLabel(status: string) {
  return status === "published" ? "已发布" : status === "draft" ? "草稿" : "已归档";
}
