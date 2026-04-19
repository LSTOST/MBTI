import Link from "next/link";

import { PageHeader } from "@/features/admin/ui/page-header";
import { EmptyState } from "@/features/admin/ui/empty-state";
import { prisma } from "@/lib/db";
import { NewBatchButton } from "@/features/admin/redemption/new-batch-button";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ page?: string }>;

export default async function AdminRedemptionPage({ searchParams }: { searchParams: SearchParams }) {
  const { page: rawPage = "1" } = await searchParams;
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const pageSize = 20;

  let batches: Awaited<ReturnType<typeof fetchBatches>>["batches"] = [];
  let total = 0;
  let dbError: string | null = null;

  try {
    ({ batches, total } = await fetchBatches(page, pageSize));
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="兑换码"
        description="以批次为单位管理测试入口凭证码。通过批次生成 / 停用 / 导出，不再维护 flat 列表。"
        crumbs={[{ label: "交易" }, { label: "兑换码" }]}
        primaryAction={
          !dbError ? (
            <div className="flex items-center gap-2">
              <Link
                href="/admin/redeem-codes"
                className="inline-flex items-center rounded-xl bg-[#1A1A24] px-3.5 py-2 text-[12px] font-medium text-[#8E8E93] hover:bg-[#22222e]"
              >
                旧版列表
              </Link>
              <NewBatchButton />
            </div>
          ) : undefined
        }
        meta={dbError ? <span className="text-[#FF453A]">⚠ DB 连接失败</span> : undefined}
      />

      {dbError ? (
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">数据库不可达：{dbError}</p>
          <p className="mt-2 font-mono text-[11px] text-[#48484A]">{dbError}</p>
        </div>
      ) : batches.length === 0 ? (
        <EmptyState
          title="尚无批次"
          description="点击右上角「新建批次」，一次性生成并配置一组兑换码。"
          action={<NewBatchButton />}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {batches.map((b) => {
              const remaining = b.codeCount - b.usedCount;
              const pct = b.codeCount > 0 ? (b.usedCount / b.codeCount) * 100 : 0;
              return (
                <article
                  key={b.id}
                  className="flex flex-col gap-4 rounded-2xl bg-[#111118] p-5 ring-1 ring-[#1A1A24] hover:ring-[#2A2A34] transition"
                >
                  <header className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-[15px] font-semibold text-[#F5F5F7]">
                        {b.name}
                      </h2>
                      <p className="mt-0.5 text-[12px] text-[#8E8E93]">
                        {b.testName ?? "全部测试通用"}
                      </p>
                    </div>
                    <time className="shrink-0 text-[11px] text-[#48484A]">
                      {new Date(b.createdAt).toLocaleDateString("zh-CN")}
                    </time>
                  </header>

                  {/* 使用进度 */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[#8E8E93]">
                        已用 <span className="font-medium text-[#F5F5F7]">{b.usedCount}</span>
                        {" "}/ 总 {b.codeCount} · 剩余{" "}
                        <span className="font-medium text-[#30D158]">{remaining}</span>
                      </span>
                      <span className="text-[#48484A]">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#1A1A24]">
                      <div
                        className="h-full rounded-full bg-[#7C5CFC]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {b.note && (
                    <p className="text-[12px] text-[#48484A]">{b.note}</p>
                  )}

                  <footer className="flex items-center gap-2">
                    <Link
                      href={`/admin/redemption/${b.id}`}
                      className="rounded-xl bg-[#1A1A24] px-3.5 py-1.5 text-[12.5px] font-medium text-[#F5F5F7] hover:bg-[#24242F]"
                    >
                      查看详情
                    </Link>
                    <a
                      href={`/api/admin/redemption/batches/${b.id}/export.csv`}
                      className="rounded-xl bg-[#1A1A24] px-3.5 py-1.5 text-[12.5px] font-medium text-[#8E8E93] hover:bg-[#24242F] hover:text-[#F5F5F7]"
                    >
                      导出 CSV
                    </a>
                  </footer>
                </article>
              );
            })}
          </div>

          {total > pageSize && (
            <div className="flex items-center justify-center gap-3 text-[13px]">
              {page > 1 && (
                <Link
                  href={`/admin/redemption?page=${page - 1}`}
                  className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]"
                >
                  上一页
                </Link>
              )}
              <span className="text-[#48484A]">第 {page} 页 · 共 {total} 批次</span>
              {page * pageSize < total && (
                <Link
                  href={`/admin/redemption?page=${page + 1}`}
                  className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]"
                >
                  下一页
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

async function fetchBatches(page: number, pageSize: number) {
  const [rows, total] = await Promise.all([
    prisma.redemptionBatch.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        test: { select: { name: true } },
        _count: { select: { codes: true } },
      },
    }),
    prisma.redemptionBatch.count(),
  ]);

  const batchIds = rows.map((r) => r.id);
  const usedAgg = await prisma.redemptionCode.groupBy({
    by: ["batchId"],
    where: { batchId: { in: batchIds } },
    _sum: { redemptionCount: true },
  });
  const usedMap = new Map(usedAgg.map((a) => [a.batchId, a._sum.redemptionCount ?? 0]));

  return {
    batches: rows.map((r) => ({
      id: r.id,
      name: r.name,
      testName: r.test?.name ?? null,
      note: r.note,
      codeCount: r._count.codes,
      usedCount: usedMap.get(r.id) ?? 0,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  };
}
