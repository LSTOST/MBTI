"use client";

import { Check, Lock, X } from "lucide-react";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
  paying: boolean;
  error?: string;
  advancedComplete?: boolean;
};

const BENEFITS = [
  "AI 长文：核心需求、冲突何来与关系推进",
  "情景与沟通：雷区、话术与可执行建议",
  "基于你的 MBTI 与进阶子人格，非模板鸡汤",
] as const;

function PaywallBody({
  onUnlock,
  paying,
  error,
  advancedComplete,
  titleId,
}: Omit<Props, "open" | "onClose"> & { titleId: string }) {
  return (
    <div className="pr-6">
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(124,92,252,0.18)]"
          aria-hidden
        >
          <Lock className="h-6 w-6 text-[#7C5CFC]" strokeWidth={1.75} />
        </div>
        <h3 id={titleId} className="text-[20px] font-semibold leading-tight tracking-tight text-[#F5F5F7]">
          解锁深度报告
        </h3>
        <p className="mt-2 max-w-[280px] text-[13px] leading-snug text-[#8E8E93]">
          {advancedComplete ? "进阶已完成 · " : ""}
          在规则报告之上，生成 AI 深度解读与可执行建议
        </p>
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {BENEFITS.map((line) => (
          <li key={line} className="flex gap-2.5 text-left">
            <span
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(52,199,89,0.16)]"
              aria-hidden
            >
              <Check className="h-2.5 w-2.5 text-[#34C759]" strokeWidth={3} />
            </span>
            <span className="min-w-0 text-[13px] leading-snug text-[#E8E8ED]">{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-[#1A1A24] pt-4">
        <p className="text-center text-[13px] font-medium text-[#E91E63]">有优惠码？</p>
        <p className="mt-1 text-center text-[11px] leading-snug text-[#8E8E93]">
          关注「知我实验室」公众号，回复「优惠码」获取
        </p>
      </div>

      <button
        type="button"
        onClick={onUnlock}
        disabled={paying}
        className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[9999px] bg-[#7C5CFC] text-[16px] font-semibold text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.25)] transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {paying ? (
          "正在处理…"
        ) : (
          <>
            <span className="text-[14px] font-medium text-[#C4B5FC] line-through decoration-[#8E8E93]">
              ¥29.90
            </span>
            <span className="text-[16px]">¥9.90</span>
            <span>立即解锁</span>
          </>
        )}
      </button>

      <p className="mt-2.5 text-center text-[10px] leading-snug text-[#48484A]">
        支持微信与支付宝；支付完成后返回本页即可查看深度报告。
      </p>

      {error ? (
        <p className="mt-2 text-center text-[12px] text-[#FF453A]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function UnlockDeepReportModal({ open, onClose, ...body }: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !body.paying) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, body.paying, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-label="关闭弹层"
        onClick={() => {
          if (!body.paying) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] w-full max-w-[380px] max-h-[min(88dvh,620px)] overflow-y-auto overscroll-contain rounded-[20px] bg-[#111118] px-5 pb-5 pt-6 shadow-[0_24px_64px_rgba(0,0,0,0.55)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={() => {
            if (!body.paying) onClose();
          }}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#8E8E93] transition-colors hover:bg-[#1A1A24] hover:text-[#F5F5F7] active:scale-95 disabled:opacity-40"
          aria-label="关闭"
          disabled={body.paying}
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <PaywallBody {...body} titleId={titleId} />
      </div>
    </div>,
    document.body,
  );
}
