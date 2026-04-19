"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={copied ? "已复制" : "复制"}
      className={
        className ??
        "rounded-md p-1 text-[#48484A] transition hover:bg-[#1A1A24] hover:text-[#F5F5F7]"
      }
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-[#30D158]" strokeWidth={2.5} />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
