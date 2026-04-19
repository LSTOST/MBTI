import { notFound } from "next/navigation";

import { PageHeader } from "@/features/admin/ui/page-header";
import { Badge, type BadgeTone } from "@/features/admin/ui/badge";
import { prisma } from "@/lib/db";
import { TestTabsBar } from "@/features/admin/tests/test-tabs-bar";
import { QuestionsEditorClient } from "@/features/admin/tests/questions-editor-client";

export const dynamic = "force-dynamic";

type Params = Promise<{ testId: string }>;

export default async function AdminTestQuestionsPage({ params }: { params: Params }) {
  const { testId } = await params;

  let data: Awaited<ReturnType<typeof findData>>;
  try {
    data = await findData(testId);
  } catch (err) {
    return <DbDownFallback testId={testId} error={err} />;
  }
  if (!data) notFound();

  const { test, questions } = data;
  const tone = statusTone(test.status);

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title={test.name}
        description="维护测试题目、题序、计分维度标签。"
        crumbs={[
          { label: "内容" },
          { label: "测试管理", href: "/admin/tests" },
          { label: test.name, href: `/admin/tests/${test.id}` },
          { label: "题目" },
        ]}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <Badge tone={tone}>{statusLabel(test.status)}</Badge>
            <span className="font-mono text-[#48484A]">/{test.slug}</span>
            <span className="text-[#48484A]">·</span>
            <span className="text-[#48484A]">共 {questions.length} 题</span>
          </div>
        }
      />

      <TestTabsBar testId={test.id} active="questions" />

      <QuestionsEditorClient
        testId={test.id}
        testSlug={test.slug}
        initialQuestions={questions.map((q) => ({
          id: q.id,
          questionKey: q.questionKey,
          orderIndex: q.orderIndex,
          type: q.type,
          prompt: q.prompt,
          dimension: q.dimension,
          config: (q.config as Record<string, unknown>) ?? {},
          updatedAt: q.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}

async function findData(testId: string) {
  const test = await prisma.testTemplate.findUnique({
    where: { id: testId },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
    },
  });
  if (!test) return null;
  const questions = await prisma.testQuestion.findMany({
    where: { testId },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
  });
  return { test, questions };
}

function DbDownFallback({ testId, error }: { testId: string; error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 py-10 md:px-8">
      <PageHeader
        title="无法加载题目"
        crumbs={[
          { label: "内容" },
          { label: "测试管理", href: "/admin/tests" },
          { label: "题目" },
        ]}
      />
      <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
        <p className="text-[13px] font-medium text-[#FF453A]">
          数据库暂不可达，无法加载 id = <code className="font-mono">{testId}</code> 的题目。
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
