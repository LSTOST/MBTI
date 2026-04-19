"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Trash2 } from "lucide-react";

import { CopyButton } from "@/features/admin/ui/copy-button";

import { readAdminJson } from "@/lib/admin-api-json";
import { useToast } from "@/features/admin/ui/toast";
import { ConfirmDialog } from "@/features/admin/ui/confirm-dialog";

type Code = {
  id: string;
  code: string;
  redemptionCount: number;
  maxRedemptions: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

export function BatchDeactivateButton({ batchId }: { batchId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);

  async function deactivate() {
    const res = await fetch(`/api/admin/redemption/batches/${batchId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deactivate: true }),
    });
    const parsed = await readAdminJson<{ ok?: boolean; error?: string }>(res);
    if (!res.ok || !parsed.ok) {
      throw new Error(parsed.ok ? (parsed.data.error ?? "停用失败") : parsed.message);
    }
    toast.success("批次已全部停用");
    setConfirm(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1A24] px-3.5 py-2 text-[12.5px] font-medium text-[#FF453A] hover:bg-[#24242F]"
      >
        <Ban className="h-3.5 w-3.5" />
        停用全部
      </button>

      {confirm && (
        <ConfirmDialog
          title="停用批次内全部码"
          description="操作不可撤销。批次内所有仍处于启用状态的兑换码将被停用，已使用的记录不受影响。"
          confirmLabel="停用"
          danger
          onConfirm={deactivate}
          onClose={() => setConfirm(false)}
        />
      )}
    </>
  );
}

export function CodeRow({ code, batchId }: { code: Code; batchId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function toggleActive() {
    setToggling(true);
    try {
      const res = await fetch(`/api/admin/redemption/codes/${code.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !code.active }),
      });
      const parsed = await readAdminJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !parsed.ok) {
        throw new Error(parsed.ok ? (parsed.data.error ?? "操作失败") : parsed.message);
      }
      toast.success(code.active ? "已停用" : "已启用");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setToggling(false);
    }
  }

  async function deleteCode() {
    const res = await fetch(`/api/admin/redemption/codes/${code.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const parsed = await readAdminJson<{ ok?: boolean; error?: string }>(res);
    if (!res.ok || !parsed.ok) {
      throw new Error(parsed.ok ? (parsed.data.error ?? "删除失败") : parsed.message);
    }
    toast.success("码已删除");
    setConfirmDelete(false);
    router.refresh();
  }

  const expired = code.expiresAt && new Date(code.expiresAt) < new Date();
  const exhausted = code.redemptionCount >= code.maxRedemptions;
  const status = !code.active ? "disabled" : expired ? "expired" : exhausted ? "exhausted" : "active";
  const statusLabel = { active: "有效", disabled: "停用", expired: "已过期", exhausted: "已用完" }[status];
  const statusColor = {
    active: "text-[#30D158]",
    disabled: "text-[#48484A]",
    expired: "text-[#FF9F0A]",
    exhausted: "text-[#8E8E93]",
  }[status];

  return (
    <>
      <tr className="border-b border-[#1A1A24] last:border-0">
        <td className="py-3 pr-4">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[13px] text-[#F5F5F7]">{code.code}</span>
            <CopyButton text={code.code} />
          </div>
        </td>
        <td className="py-3 pr-4 text-[12px] text-[#8E8E93]">
          {code.redemptionCount} / {code.maxRedemptions}
        </td>
        <td className="py-3 pr-4 text-[12px] text-[#8E8E93]">
          {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString("zh-CN") : "永久"}
        </td>
        <td className="py-3 pr-4">
          <span className={`text-[12px] font-medium ${statusColor}`}>{statusLabel}</span>
        </td>
        <td className="py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              disabled={toggling}
              onClick={() => void toggleActive()}
              className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-[#8E8E93] hover:bg-[#1A1A24] hover:text-[#F5F5F7] disabled:opacity-50"
            >
              {code.active ? "停用" : "启用"}
            </button>
            {code.redemptionCount === 0 && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg p-1.5 text-[#48484A] hover:bg-[rgba(255,69,58,0.08)] hover:text-[#FF453A]"
                aria-label="删除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {confirmDelete && (
        <ConfirmDialog
          title={`删除码 ${code.code}`}
          description="此操作不可撤销。"
          confirmLabel="删除"
          danger
          onConfirm={deleteCode}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
