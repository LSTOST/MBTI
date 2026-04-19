import Link from "next/link";

import { AdminLogoutButton } from "@/features/admin/admin-logout-button";
import { AdminSidebarNav } from "@/features/admin/admin-sidebar-nav";
import { ToastProvider } from "@/features/admin/ui/toast";

export function AdminConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-svh bg-[#0A0A0F] text-[#F5F5F7]">
        <aside
          className="hidden w-[260px] shrink-0 flex-col border-r border-[#1A1A24] bg-[#08080c] md:flex"
          aria-label="侧栏"
        >
          <div className="border-b border-[#1A1A24] px-5 py-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#48484A]">Sentio Lab</p>
            <p className="mt-1.5 text-[17px] font-semibold tracking-tight text-[#F5F5F7]">运营管理后台</p>
            <p className="mt-1 text-[12px] leading-snug text-[#8E8E93]">配不配专属运营管理平台</p>
          </div>
          <AdminSidebarNav />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-[#1A1A24] bg-[#0A0A0F]/90 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-[#0A0A0F]/75 md:px-6">
            <div className="flex min-w-0 items-center gap-3 md:hidden">
              <span className="truncate text-[14px] font-medium text-[#F5F5F7]">运营管理后台</span>
              <Link href="/admin" className="shrink-0 text-[13px] text-[#7C5CFC]">
                控制面板
              </Link>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#8E8E93] transition-colors hover:bg-[#1A1A24] hover:text-[#F5F5F7]"
              >
                查看前端
              </Link>
              <AdminLogoutButton />
            </div>
          </header>
          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </ToastProvider>
  );
}
