"use client";

import { Ban, ToggleRight, Trash2 } from "lucide-react";
import { useState } from "react";

type Props = {
  id: string;
  code: string;
  active: boolean;
  hasUses: boolean;
};

/** router.refresh() 在部分环境下不会失效本页 RSC 缓存；整页刷新确保与服务器一致 */
function hardReload() {
  window.location.reload();
}

export function CouponActions({ id, code, active, hasUses }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "操作失败");
        setBusy(false);
        return;
      }
      hardReload();
    } catch {
      setError("操作失败");
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm(`确认删除优惠码 ${code}？${hasUses ? "已有使用记录，无法删除。" : ""}`)) return;
    if (hasUses) {
      setError("已有使用记录，请改为停用");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "删除失败");
        setBusy(false);
        return;
      }
      hardReload();
    } catch {
      setError("删除失败");
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {error ? (
        <span className="mr-1 max-w-[160px] truncate text-[11px] text-[#FF453A]" title={error}>
          {error}
        </span>
      ) : null}
      <button
        type="button"
        title={active ? "停用" : "启用"}
        aria-label={active ? "停用" : "启用"}
        disabled={busy}
        onClick={() => void toggle()}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8E8E93] transition-colors hover:bg-[#1A1A24] hover:text-[#F5F5F7] disabled:opacity-40"
      >
        {active ? <Ban className="h-4 w-4" /> : <ToggleRight className="h-4 w-4 text-[#34C759]" />}
      </button>
      <button
        type="button"
        title="删除"
        aria-label="删除"
        disabled={busy}
        onClick={() => void del()}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#FF453A] transition-colors hover:bg-[rgba(255,69,58,0.1)] disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
