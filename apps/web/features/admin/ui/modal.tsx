"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function ModalScrim({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
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

/** 居中卡片式 Modal。标题 + 关闭按钮 + 内容 + 底部按钮。 */
export function Modal({
  title,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const widthClass = size === "lg" ? "max-w-[560px]" : size === "sm" ? "max-w-[380px]" : "max-w-[440px]";
  return (
    <ModalScrim onClose={onClose}>
      <div className={`w-full ${widthClass} rounded-[20px] bg-[#111118] p-6 shadow-2xl ring-1 ring-[#1A1A24]`}>
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
        <div className="mt-5">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </ModalScrim>
  );
}
