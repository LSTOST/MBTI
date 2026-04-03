"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AdvancedQuizRunner } from "@/features/quiz/advanced-quiz-runner";

function AdvancedQuizContent() {
  const params = useSearchParams();
  const reportId = params.get("reportId");

  if (!reportId) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#0A0A0F] px-6">
        <p className="text-[15px] text-[#8E8E93]">缺少报告 ID，请从报告页进入进阶测试。</p>
      </main>
    );
  }

  return <AdvancedQuizRunner reportId={reportId} />;
}

export default function AdvancedQuizPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-svh items-center justify-center bg-[#0A0A0F]">
        <p className="text-[14px] text-[#48484A]">加载中…</p>
      </main>
    }>
      <AdvancedQuizContent />
    </Suspense>
  );
}
