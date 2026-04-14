"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import clsx from "clsx";

const linkBase =
  "block rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors";

export function AdminSidebarNav() {
  const path = usePathname();
  const redeemActive = path.startsWith("/admin/redeem-codes");

  return (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="后台主导航">
      <Link
        href="/admin/redeem-codes"
        className={clsx(
          linkBase,
          redeemActive
            ? "bg-[rgba(124,92,252,0.12)] text-[#C4B5FC]"
            : "text-[#8E8E93] hover:bg-[#1A1A24] hover:text-[#F5F5F7]",
        )}
      >
        兑换码管理
      </Link>
    </nav>
  );
}
