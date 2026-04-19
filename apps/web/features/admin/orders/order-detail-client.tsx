"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { readAdminJson } from "@/lib/admin-api-json";
import { useToast } from "@/features/admin/ui/toast";
import { ConfirmDialog } from "@/features/admin/ui/confirm-dialog";

export function OrderDetailClient({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [showConfirm, setShowConfirm] = useState(false);

  const canMarkPaid = !["paid", "fulfilled"].includes(status);

  async function handleMarkPaid() {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "POST",
      credentials: "include",
    });
    const parsed = await readAdminJson<{ ok?: boolean; error?: string }>(res);
    if (!res.ok || !parsed.ok) {
      throw new Error(parsed.ok ? parsed.data.error ?? "操作失败" : parsed.message);
    }
    toast.success("已标记为已支付");
    router.refresh();
  }

  if (!canMarkPaid) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-[#111118] p-5 ring-1 ring-[#1A1A24]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#48484A]">
        运营操作
      </p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13.5px] font-medium text-[#F5F5F7]">手工标记已付</p>
          <p className="mt-0.5 text-[12px] text-[#8E8E93]">
            用于支付异常兜底。操作会写入审计日志，不发起真实退款。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="shrink-0 rounded-xl bg-[#1A1A24] px-4 py-2.5 text-[13px] font-medium text-[#F5F5F7] hover:bg-[#24242F]"
        >
          标记已付
        </button>
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="手工标记已付"
          description="此操作将把订单状态强制改为「已支付」，并写入审计日志。请确认该用户确实已完成付款（通过其他渠道核实）。"
          confirmLabel="确认标记"
          onClose={() => setShowConfirm(false)}
          onConfirm={async () => {
            await handleMarkPaid();
            setShowConfirm(false);
          }}
        />
      )}
    </div>
  );
}
