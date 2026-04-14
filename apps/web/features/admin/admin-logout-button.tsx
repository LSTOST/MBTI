"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/admin/session", { method: "DELETE", credentials: "include" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={busy}
      className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#8E8E93] transition-colors hover:bg-[#1A1A24] hover:text-[#F5F5F7] disabled:opacity-50"
    >
      {busy ? "退出中…" : "退出登录"}
    </button>
  );
}
