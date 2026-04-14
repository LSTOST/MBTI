import Link from "next/link";

import { AdminLogoutButton } from "@/features/admin/admin-logout-button";
import { AdminSidebarNav } from "@/features/admin/admin-sidebar-nav";

export function AdminConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh bg-[#0A0A0F] text-[#F5F5F7]">
      <aside
        className="hidden w-[260px] shrink-0 flex-col border-r border-[#1A1A24] bg-[#08080c] md:flex"
        aria-label="侧栏"
      >
        <div className="border-b border-[#1A1A24] px-5 py-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#48484A]">Soulmate Lab</p>
          <p className="mt-1.5 text-[17px] font-semibold tracking-tight text-[#F5F5F7]">运营控制台</p>
          <p className="mt-1 text-[12px] leading-snug text-[#8E8E93]">兑换与权益 · 内部使用</p>
        </div>
        <AdminSidebarNav />
        <div className="mt-auto border-t border-[#1A1A24] p-4">
          <p className="text-[11px] leading-relaxed text-[#48484A]">
            会话经 HttpOnly Cookie 保护。请勿在公网传播后台地址；生产环境务必使用 HTTPS。
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-[#1A1A24] bg-[#0A0A0F]/90 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-[#0A0A0F]/75 md:px-6">
          <div className="flex min-w-0 items-center gap-3 md:hidden">
            <span className="truncate text-[14px] font-medium text-[#F5F5F7]">运营控制台</span>
            <Link
              href="/admin/redeem-codes"
              className="shrink-0 text-[13px] text-[#7C5CFC]"
            >
              兑换码
            </Link>
          </div>
          <div className="ml-auto">
            <AdminLogoutButton />
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
