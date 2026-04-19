"use client";

import { useState, type ReactNode } from "react";

import { Modal } from "@/features/admin/ui/modal";

export type ConfirmDialogProps = {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** 返回 Promise 或抛错以显示错误消息 */
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
};

/** 破坏性操作确认弹层。错误显示在内部，不需要外部再处理。 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  danger,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handle() {
    setError("");
    setBusy(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#8E8E93] hover:bg-[#1A1A24]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handle()}
            className={
              danger
                ? "rounded-xl bg-[#FF453A] px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
                : "rounded-xl bg-[#7C5CFC] px-5 py-2.5 text-[14px] font-semibold text-[#F5F5F7] disabled:opacity-50"
            }
          >
            {busy ? "处理中…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-[14px] leading-relaxed text-[#8E8E93]">{description}</div>
      {error ? (
        <p className="mt-3 text-[13px] text-[#FF453A]" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
