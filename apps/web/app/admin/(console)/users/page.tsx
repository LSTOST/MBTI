import Link from "next/link";

import { PageHeader } from "@/features/admin/ui/page-header";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; page?: string }>;

const GENDER_LABEL: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
};

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, page: rawPage = "1" } = await searchParams;
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const pageSize = 30;

  let items: Awaited<ReturnType<typeof fetchUsers>>["items"] = [];
  let total = 0;
  let dbError: string | null = null;

  try {
    ({ items, total } = await fetchUsers({ q, page, pageSize }));
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="用户"
        description="按昵称或 ID 搜索用户；点击用户 ID 查看其所有报告与订单。"
        crumbs={[{ label: "内容" }, { label: "用户" }]}
        meta={!dbError ? <span className="text-[#48484A]">共 {total} 位用户</span> : undefined}
      />

      {dbError ? (
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">数据库不可达：{dbError}</p>
        </div>
      ) : (
        <>
          <form className="flex items-center gap-2" method="GET">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="搜索昵称 / 用户 ID…"
              className="rounded-xl bg-[#111118] px-3.5 py-2 text-[13px] text-[#F5F5F7] ring-1 ring-[#1A1A24] placeholder:text-[#48484A] focus:outline-none focus:ring-[#7C5CFC] sm:w-72"
            />
            <button type="submit" className="rounded-xl bg-[#1A1A24] px-4 py-2 text-[12.5px] font-medium text-[#8E8E93] hover:bg-[#22222e] hover:text-[#F5F5F7]">
              搜索
            </button>
          </form>

          <div className="rounded-2xl bg-[#111118] ring-1 ring-[#1A1A24]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A1A24]">
                  {["用户 ID", "昵称", "性别", "生日", "报告数", "注册时间"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-[#48484A]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-[#48484A]">
                      {q ? "未找到匹配用户" : "暂无用户"}
                    </td>
                  </tr>
                ) : (
                  items.map((u) => (
                    <tr key={u.id} className="border-b border-[#1A1A24] last:border-0">
                      <td className="px-5 py-3">
                        <span className="font-mono text-[11px] text-[#8E8E93]">{u.id.slice(0, 16)}…</span>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-[#F5F5F7]">{u.nickname}</td>
                      <td className="px-5 py-3 text-[12px] text-[#8E8E93]">{GENDER_LABEL[u.gender ?? ""] ?? u.gender ?? "—"}</td>
                      <td className="px-5 py-3 text-[12px] text-[#8E8E93]">{u.birthDate}</td>

                      <td className="px-5 py-3 text-[12px] text-[#F5F5F7]">{u.reportCount}</td>
                      <td className="px-5 py-3 text-[12px] text-[#48484A] whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString("zh-CN")}
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
                <Link href={`/admin/users?page=${page - 1}${q ? `&q=${q}` : ""}`} className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]">
                  上一页
                </Link>
              )}
              <span className="text-[#48484A]">第 {page} 页 · 共 {total} 位</span>
              {page * pageSize < total && (
                <Link href={`/admin/users?page=${page + 1}${q ? `&q=${q}` : ""}`} className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]">
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

async function fetchUsers({ q, page, pageSize }: { q?: string; page: number; pageSize: number }) {
  const where = q
    ? { OR: [{ nickname: { contains: q } }, { id: { contains: q } }] }
    : {};

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        nickname: true,
        gender: true,
        birthDate: true,
        createdAt: true,
        _count: { select: { reports: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: rows.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      gender: u.gender as string | null,
      birthDate: u.birthDate ? new Date(u.birthDate).toLocaleDateString("zh-CN") : "—",
      reportCount: u._count.reports,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
  };
}
