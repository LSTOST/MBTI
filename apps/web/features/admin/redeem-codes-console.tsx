"use client";

import { Ban, Check, Copy, Download, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { readAdminJson } from "@/lib/admin-api-json";

type Item = {
  id: string;
  code: string;
  note: string | null;
  maxRedemptions: number;
  redemptionCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
  useCount: number;
};

type ListResponse = {
  items: Item[];
  total: number;
  page: number;
  limit: number;
  overview: {
    codesTotal: number;
    codesActive: number;
    redemptionUsesTotal: number;
  };
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusLabel(row: Item): { text: string; className: string } {
  const now = Date.now();
  const exp = row.expiresAt ? new Date(row.expiresAt).getTime() : null;
  if (!row.active) {
    return { text: "已停用", className: "bg-[#2A2A36] text-[#8E8E93]" };
  }
  if (exp != null && exp < now) {
    return { text: "已过期", className: "bg-[rgba(255,159,10,0.14)] text-[#FF9F0A]" };
  }
  if (row.redemptionCount >= row.maxRedemptions) {
    return { text: "已用尽", className: "bg-[rgba(255,69,58,0.12)] text-[#FF453A]" };
  }
  return { text: "发放中", className: "bg-[rgba(52,199,89,0.12)] text-[#34C759]" };
}

const fetchOpts: RequestInit = { credentials: "include" };

export function RedeemCodesConsole() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<Item | null>(null);
  const [deleteRow, setDeleteRow] = useState<Item | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [qDebounced, filter]);

  const load = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        q: qDebounced,
        filter: filter === "all" ? "all" : filter === "enabled" ? "enabled" : "disabled",
      });
      const res = await fetch(`/api/admin/redeem-codes?${sp}`, fetchOpts);
      const parsed = await readAdminJson<ListResponse & { error?: string }>(res);
      if (!parsed.ok) {
        setLoadError(parsed.message);
        setData(null);
        return;
      }
      if (!res.ok) {
        setLoadError(parsed.data.error || "加载失败");
        setData(null);
        return;
      }
      setData(parsed.data);
    } finally {
      setLoading(false);
    }
  }, [page, limit, qDebounced, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      showToast("已复制到剪贴板");
    } catch {
      showToast("复制失败，请手动选择");
    }
  }

  async function toggleActive(row: Item) {
    try {
      const res = await fetch(`/api/admin/redeem-codes/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      });
      if (!res.ok) {
        showToast("操作失败");
        return;
      }
      showToast(row.active ? "已停用" : "已启用");
      void load();
    } catch {
      showToast("操作失败");
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <nav className="text-[12px] text-[#48484A]" aria-label="面包屑">
        <span className="text-[#8E8E93]">运营控制台</span>
        <span className="mx-1.5 text-[#2A2A36]" aria-hidden>
          /
        </span>
        <span className="text-[#F5F5F7]">兑换码</span>
      </nav>
      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#F5F5F7]">兑换码管理</h1>
          <p className="mt-1 max-w-[520px] text-[13px] leading-relaxed text-[#8E8E93]">
            创建与维护发放码，配置可核销次数与有效期。用户侧凭码解锁当前报告；已解锁权益不因删除记录而回滚。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start md:self-auto">
          <a
            href="/api/admin/redeem-codes/export.csv"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1A1A24] px-4 text-[14px] font-medium text-[#8E8E93] ring-1 ring-[#2A2A36] transition-colors hover:bg-[#22222e] hover:text-[#F5F5F7]"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            导出 CSV
          </a>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#7C5CFC] px-5 text-[14px] font-semibold text-[#F5F5F7] shadow-[0_0_20px_rgba(124,92,252,0.2)] transition-transform active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            新建兑换码
          </button>
        </div>
      </div>

      {data ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <StatCard label="兑换码总数" value={data.overview.codesTotal} hint="含停用" />
          <StatCard label="启用中" value={data.overview.codesActive} hint="active = true" />
          <StatCard label="累计核销（人次）" value={data.overview.redemptionUsesTotal} hint="历史核销笔数" />
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="按兑换码搜索…"
          className="h-11 w-full max-w-md rounded-xl bg-[#111118] px-4 text-[14px] text-[#F5F5F7] outline-none ring-1 ring-[#2A2A36] placeholder:text-[#48484A] focus:ring-[#7C5CFC] sm:w-80"
          aria-label="搜索兑换码"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all" as const, label: "全部" },
              { id: "enabled" as const, label: "仅启用" },
              { id: "disabled" as const, label: "仅停用" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                filter === f.id
                  ? "bg-[rgba(124,92,252,0.2)] text-[#C4B5FC]"
                  : "bg-[#1A1A24] text-[#8E8E93] hover:text-[#F5F5F7]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loadError ? (
        <p className="mt-4 rounded-xl bg-[rgba(255,69,58,0.08)] px-4 py-3 text-[13px] text-[#FF453A]" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-[#1A1A24]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#1A1A24] bg-[#111118] text-[11px] font-medium uppercase tracking-wider text-[#48484A]">
                <th className="px-4 py-3.5">兑换码</th>
                <th className="px-4 py-3.5">状态</th>
                <th className="px-4 py-3.5">已用 / 上限</th>
                <th className="px-4 py-3.5">核销记录</th>
                <th className="px-4 py-3.5">有效期</th>
                <th className="px-4 py-3.5">备注</th>
                <th className="px-4 py-3.5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="bg-[#0A0A0F]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-[#8E8E93]">
                    加载中…
                  </td>
                </tr>
              ) : !data?.items.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-[#8E8E93]">
                    暂无数据。可点击「新建兑换码」创建第一条。
                  </td>
                </tr>
              ) : (
                data.items.map((row) => {
                  const st = statusLabel(row);
                  return (
                    <tr key={row.id} className="border-b border-[#1A1A24] last:border-0">
                      <td className="px-4 py-3.5 font-mono text-[12px] text-[#E8E8ED]">{row.code}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.className}`}>
                          {st.text}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-[#8E8E93]">
                        {row.redemptionCount} / {row.maxRedemptions}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-[#8E8E93]">{row.useCount}</td>
                      <td className="px-4 py-3.5 text-[#8E8E93]">
                        {row.expiresAt ? new Date(row.expiresAt).toLocaleString("zh-CN") : "—"}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3.5 text-[#8E8E93]" title={row.note ?? ""}>
                        {row.note || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap justify-end gap-1">
                          <IconBtn label="复制" onClick={() => void copyCode(row.code)}>
                            <Copy className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn label="编辑" onClick={() => setEditRow(row)}>
                            <Pencil className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn
                            label={row.active ? "停用" : "启用"}
                            onClick={() => void toggleActive(row)}
                          >
                            {row.active ? (
                              <Ban className="h-4 w-4" />
                            ) : (
                              <ToggleRight className="h-4 w-4 text-[#34C759]" />
                            )}
                          </IconBtn>
                          <IconBtn
                            label="删除"
                            danger
                            onClick={() => setDeleteRow(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.total > limit ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#8E8E93]">
          <span>
            共 {data.total} 条 · 第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg bg-[#1A1A24] px-3 py-1.5 text-[#F5F5F7] disabled:opacity-40"
            >
              上一页
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg bg-[#1A1A24] px-3 py-1.5 text-[#F5F5F7] disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#1A1A24] px-4 py-2.5 text-[13px] text-[#F5F5F7] shadow-lg ring-1 ring-[#2A2A36]">
          <Check className="h-4 w-4 text-[#34C759]" strokeWidth={2} />
          {toast}
        </div>
      ) : null}

      {createOpen ? (
        <CodeFormModal
          title="新建兑换码"
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            showToast("已创建");
            void load();
          }}
        />
      ) : null}

      {editRow ? (
        <CodeFormModal
          title="编辑兑换码"
          mode="edit"
          initial={editRow}
          onClose={() => setEditRow(null)}
          onSaved={() => {
            setEditRow(null);
            showToast("已保存");
            void load();
          }}
        />
      ) : null}

      {deleteRow ? (
        <DeleteModal
          row={deleteRow}
          onClose={() => setDeleteRow(null)}
          onDone={() => {
            setDeleteRow(null);
            showToast("已删除");
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl bg-[#111118] px-5 py-4 ring-1 ring-[#1A1A24]">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#48484A]">{label}</p>
      <p className="mt-1.5 font-display text-[28px] font-semibold tabular-nums text-[#F5F5F7]">{value}</p>
      <p className="mt-1 text-[11px] text-[#48484A]">{hint}</p>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
        danger
          ? "text-[#FF453A] hover:bg-[rgba(255,69,58,0.1)]"
          : "text-[#8E8E93] hover:bg-[#1A1A24] hover:text-[#F5F5F7]"
      }`}
    >
      {children}
    </button>
  );
}

function CodeFormModal({
  title,
  mode = "create",
  initial,
  onClose,
  onSaved,
}: {
  title: string;
  mode?: "create" | "edit";
  initial?: Item;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [customCode, setCustomCode] = useState("");
  const [maxR, setMaxR] = useState(mode === "edit" ? initial!.maxRedemptions : 1);
  const [exp, setExp] = useState(mode === "edit" ? toDatetimeLocalValue(initial!.expiresAt) : "");
  const [note, setNote] = useState(mode === "edit" ? initial!.note ?? "" : "");
  const [active, setActive] = useState(mode === "edit" ? initial!.active : true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const expiresPayload = exp.trim() === "" ? null : new Date(exp).toISOString();
      if (mode === "create") {
        const res = await fetch("/api/admin/redeem-codes", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: customCode.trim() || undefined,
            maxRedemptions: maxR,
            expiresAt: expiresPayload,
            note: note.trim() || null,
            active,
          }),
        });
        const parsed = await readAdminJson<{ error?: string; code?: string }>(res);
        if (!parsed.ok) {
          setError(parsed.message);
          return;
        }
        if (!res.ok) {
          setError(parsed.data.error || "创建失败");
          return;
        }
        onSaved();
        return;
      }

      const res = await fetch(`/api/admin/redeem-codes/${initial!.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxRedemptions: maxR,
          expiresAt: expiresPayload,
          note: note.trim() || null,
          active,
        }),
      });
      const parsed = await readAdminJson<{ error?: string }>(res);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      if (!res.ok) {
        setError(parsed.data.error || "保存失败");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalScrim onClose={onClose}>
      <div className="w-full max-w-[440px] rounded-[20px] bg-[#111118] p-6 shadow-2xl ring-1 ring-[#1A1A24]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[18px] font-semibold text-[#F5F5F7]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8E8E93] hover:bg-[#1A1A24] hover:text-[#F5F5F7]"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {mode === "edit" ? (
            <div>
              <label className="text-[12px] text-[#8E8E93]">兑换码（不可改）</label>
              <p className="mt-1 font-mono text-[14px] text-[#E8E8ED]">{initial!.code}</p>
            </div>
          ) : (
            <label className="block text-[12px] text-[#8E8E93]">
              自定义码（留空则系统自动生成）
              <input
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl bg-[#0A0A0F] px-3 text-[14px] text-[#F5F5F7] outline-none ring-1 ring-[#2A2A36] focus:ring-[#7C5CFC]"
              />
            </label>
          )}

          <label className="block text-[12px] text-[#8E8E93]">
            总可核销次数
            <input
              type="number"
              min={1}
              value={maxR}
              onChange={(e) => setMaxR(Number(e.target.value) || 1)}
              className="mt-1.5 h-11 w-full rounded-xl bg-[#0A0A0F] px-3 text-[14px] outline-none ring-1 ring-[#2A2A36] focus:ring-[#7C5CFC]"
            />
          </label>

          <label className="block text-[12px] text-[#8E8E93]">
            过期时间（留空 = 永不过期）
            <input
              type="datetime-local"
              value={exp}
              onChange={(e) => setExp(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl bg-[#0A0A0F] px-3 text-[14px] outline-none ring-1 ring-[#2A2A36] focus:ring-[#7C5CFC]"
            />
          </label>

          <label className="block text-[12px] text-[#8E8E93]">
            备注
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl bg-[#0A0A0F] px-3 text-[14px] outline-none ring-1 ring-[#2A2A36] focus:ring-[#7C5CFC]"
            />
          </label>

          <label className="flex items-center gap-2 text-[13px] text-[#8E8E93]">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded accent-[#7C5CFC]"
            />
            启用
          </label>
        </div>

        {error ? (
          <p className="mt-4 text-[13px] text-[#FF453A]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#8E8E93] hover:bg-[#1A1A24]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="rounded-xl bg-[#7C5CFC] px-5 py-2.5 text-[14px] font-semibold text-[#F5F5F7] disabled:opacity-50"
          >
            {busy ? "提交中…" : mode === "create" ? "创建" : "保存"}
          </button>
        </div>
      </div>
    </ModalScrim>
  );
}

function DeleteModal({
  row,
  onClose,
  onDone,
}: {
  row: Item;
  onClose: () => void;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/redeem-codes/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const parsed = await readAdminJson<{ error?: string }>(res);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      if (!res.ok) {
        setError(parsed.data.error || "删除失败");
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalScrim onClose={onClose}>
      <div className="w-full max-w-[400px] rounded-[20px] bg-[#111118] p-6 ring-1 ring-[#1A1A24]">
        <h2 className="text-[18px] font-semibold text-[#F5F5F7]">确认删除</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-[#8E8E93]">
          将永久删除兑换码{" "}
          <span className="font-mono text-[#E8E8ED]">{row.code}</span>{" "}
          及后台核销记录；已通过该码解锁的报告<strong className="text-[#F5F5F7]">不会</strong>
          被撤销。
        </p>
        {error ? (
          <p className="mt-3 text-[13px] text-[#FF453A]" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#8E8E93] hover:bg-[#1A1A24]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirm()}
            className="rounded-xl bg-[#FF453A] px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? "删除中…" : "删除"}
          </button>
        </div>
      </div>
    </ModalScrim>
  );
}

function ModalScrim({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative z-[1] max-h-[min(90dvh,720px)] overflow-y-auto">{children}</div>
    </div>
  );
}
