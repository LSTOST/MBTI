"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { readAdminJson } from "@/lib/admin-api-json";

const PEEK_MS = 4000;

type Props = {
  /** 服务端未配置 ADMIN_REDEEM_SECRET */
  configError?: boolean;
};

export function AdminLoginForm({ configError }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (peekTimer.current) clearTimeout(peekTimer.current);
    };
  }, []);

  const peekPassword = useCallback(() => {
    setShowPw(true);
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => {
      setShowPw(false);
      peekTimer.current = null;
    }, PEEK_MS);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const parsed = await readAdminJson<{ error?: string }>(res);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      if (!res.ok) {
        setError(parsed.data.error || "登录失败");
        return;
      }
      router.push("/admin/redeem-codes");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#0A0A0F] px-4 py-12">
      <div className="w-full max-w-[400px] rounded-[20px] bg-[#111118] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-[#1A1A24]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#48484A]">Soulmate Lab</p>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-[#F5F5F7]">运营控制台</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#8E8E93]">
          请输入环境变量 <code className="text-[#7C5CFC]">ADMIN_REDEEM_SECRET</code>{" "}
          对应的完整密钥。登录后通过 HttpOnly 会话保持，请勿与他人共享。
        </p>

        {configError ? (
          <p className="mt-4 rounded-xl bg-[rgba(255,159,10,0.1)] px-3 py-2 text-[13px] text-[#FF9F0A]" role="alert">
            服务端未配置 <code className="font-mono text-[12px]">ADMIN_REDEEM_SECRET</code>
            ，无法登录。请先写入环境变量后重启服务。
          </p>
        ) : null}

        <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
          <label className="block text-[12px] font-medium text-[#8E8E93]">
            管理密钥
            <div className="relative mt-1.5">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-12 w-full rounded-xl bg-[#0A0A0F] py-2 pl-3 pr-11 text-[15px] text-[#F5F5F7] outline-none ring-1 ring-[#2A2A36] placeholder:text-[#48484A] focus:ring-[#7C5CFC]"
                placeholder="粘贴密钥"
              />
              <button
                type="button"
                onClick={() => peekPassword()}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 select-none items-center justify-center rounded-lg text-[#8E8E93] hover:bg-[#1A1A24] hover:text-[#F5F5F7]"
                aria-label={`短暂显示密钥（${PEEK_MS / 1000} 秒后隐藏）`}
                title={`点击显示明文，${PEEK_MS / 1000} 秒后自动隐藏`}
              >
                <Eye className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
          </label>

          {error ? (
            <p className="text-[13px] text-[#FF453A]" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !password.trim()}
            className="flex h-[52px] w-full items-center justify-center rounded-xl bg-[#7C5CFC] text-[16px] font-semibold text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.2)] transition-transform active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? "验证中…" : "进入控制台"}
          </button>
        </form>
      </div>
      <p className="mt-8 max-w-[400px] text-center text-[11px] leading-relaxed text-[#48484A]">
        本系统仅供授权运营人员使用。所有操作均应具备合法依据，并遵守数据与用户权益相关规范。
      </p>
    </div>
  );
}
