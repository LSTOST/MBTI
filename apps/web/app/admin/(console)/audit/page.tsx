import Link from "next/link";

import { PageHeader } from "@/features/admin/ui/page-header";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ action?: string; targetType?: string; page?: string }>;

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const { action: actionFilter, targetType: typeFilter, page: rawPage = "1" } = await searchParams;
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const pageSize = 50;

  let items: Awaited<ReturnType<typeof fetchLogs>>["items"] = [];
  let total = 0;
  let dbError: string | null = null;

  try {
    ({ items, total } = await fetchLogs({ action: actionFilter, targetType: typeFilter, page, pageSize }));
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 md:px-8">
      <PageHeader
        title="审计日志"
        description="后台关键操作留痕。actor 当前固定为 admin；RBAC 落地后切换到真实用户 id。"
        crumbs={[{ label: "系统" }, { label: "审计日志" }]}
        meta={!dbError ? <span className="text-[#48484A]">共 {total} 条记录</span> : undefined}
      />

      {dbError ? (
        <div className="rounded-2xl bg-[rgba(255,69,58,0.08)] p-5 ring-1 ring-[rgba(255,69,58,0.24)]">
          <p className="text-[13px] text-[#FF453A]">数据库不可达：{dbError}</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-[#111118] ring-1 ring-[#1A1A24]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A1A24]">
                  {["时间", "操作", "对象类型", "对象 ID", "IP", "变更"].map((h, i) => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-[#48484A] ${i === 0 ? "text-left" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-[#48484A]">
                      暂无审计记录
                    </td>
                  </tr>
                ) : (
                  items.map((r) => (
                    <tr key={r.id} className="border-b border-[#1A1A24] last:border-0">
                      <td className="px-5 py-3 text-[12px] text-[#8E8E93] whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString("zh-CN", { hour12: false })}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-[12px] text-[#F5F5F7]">{r.action}</span>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-[#8E8E93]">{r.targetType}</td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-[11px] text-[#48484A]">
                          {r.targetId ? r.targetId.slice(0, 12) + "…" : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-[#48484A]">{r.ip ?? "—"}</td>
                      <td className="px-5 py-3">
                        {r.diff ? (
                          <details className="cursor-pointer">
                            <summary className="list-none text-[11.5px] text-[#7C5CFC] hover:underline">查看</summary>
                            <pre className="mt-2 max-w-[300px] overflow-x-auto rounded-lg bg-[#0A0A0F] p-2 text-[10.5px] text-[#8E8E93]">
                              {JSON.stringify(r.diff, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-[11.5px] text-[#2A2A36]">—</span>
                        )}
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
                <Link href={`/admin/audit?page=${page - 1}`} className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]">
                  上一页
                </Link>
              )}
              <span className="text-[#48484A]">第 {page} 页 · 共 {total} 条</span>
              {page * pageSize < total && (
                <Link href={`/admin/audit?page=${page + 1}`} className="rounded-xl px-4 py-2 ring-1 ring-[#1A1A24] hover:ring-[#7C5CFC]">
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

async function fetchLogs({
  action,
  targetType,
  page,
  pageSize,
}: {
  action?: string;
  targetType?: string;
  page: number;
  pageSize: number;
}) {
  const where = {
    ...(action ? { action: { contains: action } } : {}),
    ...(targetType ? { targetType } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      actor: r.actor,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      diff: r.diff,
      ip: r.ip,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  };
}
