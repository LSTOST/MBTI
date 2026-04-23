"use client";

import { useState } from "react";

import { clearReportHistoryAction } from "@/app/actions/clear-report-history";
import { MBTI_ADVANCED_PROGRESS_KEY, MBTI_INTAKE_KEY, MBTI_PROGRESS_KEY } from "@/lib/mbti-storage";

export function ClearHistoryButton() {
  const [busy, setBusy] = useState(false);

  async function onClear() {
    if (!window.confirm("确定清除全部历史记录？本机报告列表与答题草稿会一并清空，且不可恢复。")) {
      return;
    }
    setBusy(true);
    try {
      const result = await clearReportHistoryAction();
      if (!result.ok) {
        window.alert(`清除失败：${result.message}`);
        return;
      }
      try {
        window.localStorage.removeItem(MBTI_INTAKE_KEY);
        window.localStorage.removeItem(MBTI_PROGRESS_KEY);
        window.localStorage.removeItem(MBTI_ADVANCED_PROGRESS_KEY);
      } catch {
        /* ignore */
      }
      /**
       * router.refresh() / window.location.href 都可能被 bfcache 还原旧 RSC 快照；
       * 带唯一 query 走 replace，确保浏览器把本页当全新请求重新拉 RSC，且不可回退到脏态。
       */
      window.location.replace(`/?cleared=${Date.now()}`);
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
