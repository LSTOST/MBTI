"use client";

import { useState } from "react";
import { Loader2, Key, AlertCircle } from "lucide-react";

type Props = {
  testSlug: string;
  testName: string;
};

export function RedeemGateForm({ testSlug, testName }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tests/${testSlug}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "兑换失败，请检查码是否正确");
        setLoading(false);
        return;
      }
      // 成功，跳转至答题页
      window.location.href = `/quiz/${testSlug}`;
    } catch {
      setError("网络错误，请稍后重试");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[428px] flex-col items-center justify-center gap-6 bg-[#0A0A0F] px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(124,92,252,0.12)] ring-1 ring-[rgba(124,92,252,0.3)]">
          <Key className="h-6 w-6 text-[#7C5CFC]" />
        </div>
        <h1 className="text-[22px] font-bold text-[#F5F5F7]">{testName}</h1>
        <p className="text-[14px] leading-relaxed text-[#8E8E93]">
          该测试需要兑换码才能进入，请输入你的专属码。
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex w-full flex-col gap-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="输入兑换码"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          className="h-12 w-full rounded-2xl bg-[#1A1A24] px-5 text-center font-mono text-[16px] tracking-widest text-[#F5F5F7] ring-1 ring-[#2C2C3A] placeholder:tracking-normal placeholder:text-[#48484A] focus:outline-none focus:ring-[#7C5CFC]"
        />

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-[rgba(255,69,58,0.08)] px-4 py-2.5 text-[13px] text-[#FF453A] ring-1 ring-[rgba(255,69,58,0.24)]">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#7C5CFC] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          验证并进入
        </button>
      </form>

      <p className="text-[12px] text-[#48484A]">没有兑换码？请联系活动发起方获取。</p>
    </main>
  );
}
