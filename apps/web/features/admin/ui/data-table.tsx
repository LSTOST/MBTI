"use client";

import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  /** cell 渲染函数 */
  render: (row: T) => ReactNode;
  /** 右对齐（数字/操作列） */
  align?: "left" | "right" | "center";
  /** 可选固定宽度，默认 auto */
  width?: string;
  /** 截断并 title 显示原文（长备注列很好用） */
  truncate?: boolean;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: ReactNode;
  /** 最小内容宽度（触发水平滚动） */
  minWidth?: number;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage = "暂无数据",
  minWidth = 880,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-[#1A1A24]">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-[13px]"
          style={{ minWidth: `${minWidth}px` }}
        >
          <thead>
            <tr className="border-b border-[#1A1A24] bg-[#111118] text-[11px] font-medium uppercase tracking-wider text-[#48484A]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3.5"
                  style={{
                    textAlign: c.align ?? "left",
                    width: c.width,
                  }}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-[#0A0A0F]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-[#8E8E93]">
                  加载中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-[#8E8E93]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-[#1A1A24] last:border-0">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className="px-4 py-3.5 text-[#8E8E93]"
                      style={{
                        textAlign: c.align ?? "left",
                        maxWidth: c.truncate ? 160 : undefined,
                      }}
                    >
                      {c.truncate ? (
                        <div className="truncate" title={typeof row === "object" ? undefined : String(row)}>
                          {c.render(row)}
                        </div>
                      ) : (
                        c.render(row)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 分页栏，常与 DataTable 搭配使用。 */
export function Pagination({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
  disabled,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#8E8E93]">
      <span>
        共 {total} 条 · 第 {page} / {totalPages} 页
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1 || disabled}
          onClick={onPrev}
          className="rounded-lg bg-[#1A1A24] px-3 py-1.5 text-[#F5F5F7] disabled:opacity-40"
        >
          上一页
        </button>
        <button
          type="button"
          disabled={page >= totalPages || disabled}
          onClick={onNext}
          className="rounded-lg bg-[#1A1A24] px-3 py-1.5 text-[#F5F5F7] disabled:opacity-40"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
