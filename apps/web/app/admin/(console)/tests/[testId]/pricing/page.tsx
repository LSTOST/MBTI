import { notFound } from "next/navigation";

import { PageHeader } from "@/features/admin/ui/page-header";
import { Badge, type BadgeTone } from "@/features/admin/ui/badge";
import { prisma } from "@/lib/db";
import { TestTabsBar } from "@/features/admin/tests/test-tabs-bar";
import { PricingClient } from "@/features/admin/tests/pricing-client";

export const dynamic = "force-dynamic";

type Params = Promise<{ testId: string }>;

export default async function AdminTestPricingPage({ params }: { params: Params }) {
  const { testId } = await params;

  let data: Awaited<ReturnType<typeof findTest>>;
  try {
    data = await findTest(testId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 py-10 md:px-8">
        <PageHeader
          title="无法加载定价配置"
          crumbs={[{ label: "内容" }, { label: "测试管理", href: "/admin/tests" }, { label: "定价" }]}
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

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title={data.name}
        description="配置测试的入场模式与定价策略，影响用户端入口逻辑。"
        crumbs={[
          { label: "内容" },
          { label: "测试管理", href: "/admin/tests" },
          { label: data.name, href: `/admin/tests/${data.id}` },
          { label: "定价" },
        ]}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <Badge tone={tone}>{statusLabel(data.status)}</Badge>
            <span className="font-mono text-[#48484A]">/{data.slug}</span>
          </div>
        }
      />

      <TestTabsBar testId={data.id} active="pricing" />

      <PricingClient
        testId={data.id}
        initialAccessMode={data.accessMode}
        initialPricingMode={data.pricingMode}
        initialBasePrice={data.basePrice}
        initialAiPrice={data.aiPrice}
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
      accessMode: true,
      pricingMode: true,
      basePrice: true,
      aiPrice: true,
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
