import Link from "next/link";

import { PageHeader } from "@/features/admin/ui/page-header";
import { Badge, type BadgeTone } from "@/features/admin/ui/badge";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  free_ready: "免费可看",
  paid_ready: "付费就绪",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  free_ready: "success",
  paid_ready: "accent",
};

export default async function AdminReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, status: statusFilter, page: rawPage = "1" } = await searchParams;
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const pageSize = 30;

  let items: Awaited<ReturnType<typeof fetchReports>>["items"] = [];
  let total = 0;
  let dbError: string | null = null;

  try {
    ({ items, total } = await fetchReports({ q, status: statusFilter, page, pageSize }));
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="报告"
        description="浏览所有测试产出的报告，支持按 MBTI 类型、状态、昵称搜索。"
        crumbs={[{ label: "内容" }, { label: "报告" }]}
        meta={!dbError ? <span className="text-[#48484A]">共 {total} 份报告</span> : undefined}
      />

      {dbError ? (
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">数据库不可达：{dbError}</p>
        </div>
      ) : (
        <>
          {/* 搜索 + 状态过滤 */}
          <form className="flex flex-wrap items-center gap-2" method="GET">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="搜索昵称 / MBTI 类型…"
              className="rounded-xl bg-[#111118] px-3.5 py-2 text-[13px] text-[#F5F5F7] ring-1 ring-[#1A1A24] placeholder:text-[#48484A] focus:outline-none focus:ring-[#7C5CFC] sm:w-64"
            />
            <div className="flex gap-1.5">
              {[
                { label: "全部", value: "" },
                { label: "草稿", value: "draft" },
                { label: "免费可看", value: "free_ready" },
                { label: "付费就绪", value: "paid_ready" },
              ].map((opt) => (
                <Link
                  key={opt.value}
                  href={`/admin/reports?status=${opt.value}${q ? `&q=${q}` : ""}`}
                  className={`rounded-xl px-3 py-1.5 text-[12px] font-medium ${(statusFilter ?? "") === opt.value ? "bg-[rgba(124,92,252,0.14)] text-[#C4B5FC]" : "text-[#8E8E93] hover:bg-[#1A1A24]"}`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </form>

          <div className="rounded-2xl bg-[#111118] ring-1 ring-[#1A1A24]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A1A24]">
                  {["昵称", "类型", "测试", "状态", "答题", "创建时间", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-[#48484A]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-[#48484A]">
                      暂无报告
                    </td>
                  </tr>
                ) : (
                  items.map((r) => (
                    <tr key={r.id} className="border-b border-[#1A1A24] last:border-0">
                      <td className="px-5 py-3 text-[13px] text-[#F5F5F7]">{r.nickname}</td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-[13px] font-medium text-[#C4B5FC]">{r.mbtiType}</span>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-[#8E8E93]">{r.testName ?? "—"}</td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-[12px] tabular-nums">
                        {r.answerCount > 0 ? (
                          <span className="text-[#34C759]">{r.answerCount} 题</span>
                        ) : (
                          <span className="text-[#48484A]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[12px] text-[#48484A] whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/report/${r.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-[#8E8E93] hover:bg-[#1A1A24] hover:text-[#F5F5F7]"
                        >
                          查看报告 ↗
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > pageSize && (
            <div className="flex items-center justify-center gap-3 text-[13px]">
              {page > 1 && (
                <Link href={`/admin/reports?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}${q ? `&q=${q}` : ""}`} className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]">
                  上一页
                </Link>
              )}
              <span className="text-[#48484A]">第 {page} 页 · 共 {total} 份</span>
              {page * pageSize < total && (
                <Link href={`/admin/reports?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}${q ? `&q=${q}` : ""}`} className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]">
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

async function fetchReports({
  q,
  status,
  page,
  pageSize,
}: {
  q?: string;
  status?: string;
  page: number;
  pageSize: number;
}) {
  const where = {
    ...(status ? { status: status as never } : {}),
    ...(q
      ? {
          OR: [
            { nickname: { contains: q } },
            { mbtiType: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        nickname: true,
        mbtiType: true,
        status: true,
        testId: true,
        test: { select: { name: true } },
        createdAt: true,
        user: {
          select: {
            quizAttempts: {
              where: { status: "completed" },
              orderBy: { completedAt: "desc" },
              take: 1,
              select: { id: true, _count: { select: { answers: true } } },
            },
          },
        },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      nickname: r.nickname,
      mbtiType: r.mbtiType,
      status: r.status as string,
      testName: r.test?.name ?? null,
      createdAt: r.createdAt.toISOString(),
      answerCount: r.user.quizAttempts[0]?._count.answers ?? 0,
      quizAttemptId: r.user.quizAttempts[0]?.id ?? null,
    })),
    total,
  };
}
