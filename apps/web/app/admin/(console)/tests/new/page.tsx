import { PageHeader } from "@/features/admin/ui/page-header";
import { listReportStrategies } from "@/lib/test-strategy";
import { NewTestClient } from "@/features/admin/tests/new-test-client";

export const dynamic = "force-dynamic";

export default function AdminNewTestPage() {
  const strategies = listReportStrategies();
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="新建测试"
        description="填写基础信息后即可保存草稿，之后在详情页补录题目和计分配置再发布。"
        crumbs={[
          { label: "内容" },
          { label: "测试管理", href: "/admin/tests" },
          { label: "新建" },
        ]}
      />
      <NewTestClient
        strategies={strategies.map((s) => ({
          id: s.id,
          displayName: s.displayName,
          description: s.description,
        }))}
      />
    </div>
  );
}
