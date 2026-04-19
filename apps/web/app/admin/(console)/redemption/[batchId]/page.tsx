import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/features/admin/ui/page-header";
import { prisma } from "@/lib/db";
import { BatchDeactivateButton, CodeRow } from "@/features/admin/redemption/batch-detail-client";

export const dynamic = "force-dynamic";

type Params = Promise<{ batchId: string }>;
type SearchParams = Promise<{ page?: string }>;

export default async function BatchDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { batchId } = await params;
  const { page: rawPage = "1" } = await searchParams;
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const pageSize = 50;

  let batch: Awaited<ReturnType<typeof fetchBatch>> | null = null;
  let dbError: string | null = null;

  try {
    batch = await fetchBatch(batchId, page, pageSize);
  } catch (err) {
    if ((err as { code?: string }).code === "NOT_FOUND") notFound();
    dbError = err instanceof Error ? err.message : String(err);
  }

  if (!batch && !dbError) notFound();

  const remaining = batch ? batch.codeCount - batch.usedCount : 0;
  const pct = batch && batch.codeCount > 0 ? (batch.usedCount / batch.codeCount) * 100 : 0;
  const activeCodeCount = batch?.codes.items.filter((c) => c.active).length ?? 0;

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title={batch?.name ?? "批次详情"}
        description={batch?.note ?? "批次内兑换码管理"}
        crumbs={[{ label: "交易" }, { label: "兑换码", href: "/admin/redemption" }, { label: batch?.name ?? batchId }]}
        primaryAction={
          batch ? (
            <div className="flex items-center gap-2">
              <a
                href={`/api/admin/redemption/batches/${batchId}/export.csv`}
                className="inline-flex items-center rounded-xl bg-[#1A1A24] px-3.5 py-2 text-[12.5px] font-medium text-[#8E8E93] hover:bg-[#22222e] hover:text-[#F5F5F7]"
              >
                导出 CSV
              </a>
              <BatchDeactivateButton batchId={batchId} />
            </div>
          ) : undefined
        }
      />

      {dbError ? (
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">数据库不可达：{dbError}</p>
        </div>
      ) : batch ? (
        <>
          {/* 批次统计卡 */}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "总量", value: batch.codeCount },
              { label: "已用", value: batch.usedCount },
              { label: "剩余", value: remaining },
              { label: "使用率", value: `${pct.toFixed(1)}%` },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-[#111118] p-4 ring-1 ring-[#1A1A24]"
              >
                <p className="text-[11px] uppercase tracking-wide text-[#48484A]">{s.label}</p>
                <p className="mt-1 text-[22px] font-semibold text-[#F5F5F7]">{s.value}</p>
              </div>
            ))}
          </div>

          {/* 进度条 */}
          <div className="h-2 overflow-hidden rounded-full bg-[#1A1A24]">
            <div
              className="h-full rounded-full bg-[#7C5CFC] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* 批次元信息 */}
          <div className="grid gap-2 rounded-2xl bg-[#111118] p-5 ring-1 ring-[#1A1A24] sm:grid-cols-3">
            {[
              { label: "绑定测试", value: batch.testName ?? "全部测试通用" },
              {
                label: "创建时间",
                value: new Date(batch.createdAt).toLocaleString("zh-CN"),
              },
              { label: "备注", value: batch.note ?? "—" },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-[11px] text-[#48484A]">{f.label}</p>
                <p className="mt-0.5 text-[13px] text-[#F5F5F7]">{f.value}</p>
              </div>
            ))}
          </div>

          {/* 码列表 */}
          <section className="rounded-2xl bg-[#111118] ring-1 ring-[#1A1A24]">
            <header className="flex items-center justify-between border-b border-[#1A1A24] px-5 py-3.5">
              <p className="text-[13px] font-medium text-[#F5F5F7]">
                本页码列表（第 {page} 页 · 共 {batch.codes.total} 张）
              </p>
              <span className="text-[12px] text-[#48484A]">
                本页 {batch.codes.items.length} 张，启用 {activeCodeCount} 张
              </span>
            </header>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A1A24]">
                    {["码", "核销 / 上限", "到期", "状态", ""].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-[#48484A] ${h === "" ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batch.codes.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-[13px] text-[#48484A]">
                        暂无码
                      </td>
                    </tr>
                  ) : (
                    batch.codes.items.map((c) => (
                      <CodeRow key={c.id} code={c} batchId={batchId} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {batch.codes.total > pageSize && (
              <div className="flex items-center justify-center gap-3 border-t border-[#1A1A24] py-4 text-[13px]">
                {page > 1 && (
                  <Link
                    href={`/admin/redemption/${batchId}?page=${page - 1}`}
                    className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]"
                  >
                    上一页
                  </Link>
                )}
                <span className="text-[#48484A]">第 {page} 页</span>
                {page * pageSize < batch.codes.total && (
                  <Link
                    href={`/admin/redemption/${batchId}?page=${page + 1}`}
                    className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]"
                  >
                    下一页
                  </Link>
                )}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

async function fetchBatch(batchId: string, page: number, pageSize: number) {
  const [batch, usedAgg, codes, codesTotal] = await Promise.all([
    prisma.redemptionBatch.findUnique({
      where: { id: batchId },
      include: {
        test: { select: { name: true } },
        _count: { select: { codes: true } },
      },
    }),
    prisma.redemptionCode.aggregate({
      where: { batchId },
      _sum: { redemptionCount: true },
    }),
    prisma.redemptionCode.findMany({
      where: { batchId },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        codeNormalized: true,
        redemptionCount: true,
        maxRedemptions: true,
        expiresAt: true,
        active: true,
        createdAt: true,
      },
    }),
    prisma.redemptionCode.count({ where: { batchId } }),
  ]);

  if (!batch) {
    const err = new Error("NOT_FOUND") as Error & { code: string };
    err.code = "NOT_FOUND";
    throw err;
  }

  return {
    id: batch.id,
    name: batch.name,
    note: batch.note,
    testName: batch.test?.name ?? null,
    codeCount: batch._count.codes,
    usedCount: usedAgg._sum.redemptionCount ?? 0,
    createdAt: batch.createdAt.toISOString(),
    codes: {
      items: codes.map((c) => ({
        id: c.id,
        code: c.codeNormalized,
        redemptionCount: c.redemptionCount,
        maxRedemptions: c.maxRedemptions,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        active: c.active,
        createdAt: c.createdAt.toISOString(),
      })),
      total: codesTotal,
    },
  };
}
