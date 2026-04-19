"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { clearReportHistoryAction } from "@/app/actions/clear-report-history";
import { MBTI_ADVANCED_PROGRESS_KEY, MBTI_INTAKE_KEY, MBTI_PROGRESS_KEY } from "@/lib/mbti-storage";

export function ClearHistoryButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClear() {
    if (!window.confirm("确定清除全部历史记录？本机报告列表与答题草稿会一并清空，且不可恢复。")) {
      return;
    }
    setBusy(true);
    try {
      await clearReportHistoryAction();
      try {
        window.localStorage.removeItem(MBTI_INTAKE_KEY);
        window.localStorage.removeItem(MBTI_PROGRESS_KEY);
        window.localStorage.removeItem(MBTI_ADVANCED_PROGRESS_KEY);
      } catch {
        /* ignore */
      }
      router.refresh();
    } catch (e) {
      console.error(e);
      window.alert(
        e instanceof Error ? `清除失败：${e.message}` : "清除失败，请稍后重试。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onClear()}
      disabled={busy}
      className="text-[13px] text-[#48484A] underline decoration-[#48484A]/50 underline-offset-4 transition-colors active:text-[#8E8E93] disabled:opacity-50"
    >
      {busy ? "正在清除…" : "清除历史记录"}
    </button>
  );
}
