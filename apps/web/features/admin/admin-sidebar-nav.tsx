"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  FileText,
  FileSearch,
  Users,
  Receipt,
  Ticket,
  BadgePercent,
  BarChart3,
  Activity,
  Filter,
  Sparkles,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 自定义激活匹配；默认 startsWith(href) */
  match?: (path: string) => boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "概览",
    items: [
      {
        href: "/admin",
        label: "数据总览",
        icon: LayoutDashboard,
        match: (p) => p === "/admin" || p === "/admin/",
      },
    ],
  },
  {
    title: "内容",
    items: [
      { href: "/admin/tests", label: "测试管理", icon: FileText },
      { href: "/admin/reports", label: "报告", icon: FileSearch },
      { href: "/admin/users", label: "用户", icon: Users },
    ],
  },
  {
    title: "交易",
    items: [
      { href: "/admin/orders", label: "订单", icon: Receipt },
      {
        href: "/admin/redeem-codes",
        label: "兑换码",
        icon: Ticket,
        match: (p) => p.startsWith("/admin/redemption") || p.startsWith("/admin/redeem-codes"),
      },
      { href: "/admin/coupons", label: "优惠码", icon: BadgePercent },
    ],
  },
  {
    title: "分析",
    items: [
      {
        href: "/admin/analytics",
        label: "概览",
        icon: BarChart3,
        match: (p) =>
          p === "/admin/analytics" ||
          (p.startsWith("/admin/analytics") &&
            !p.startsWith("/admin/analytics/events") &&
            !p.startsWith("/admin/analytics/funnels")),
      },
      { href: "/admin/analytics/events", label: "事件", icon: Activity },
      { href: "/admin/analytics/funnels", label: "漏斗", icon: Filter },
    ],
  },
  {
    title: "系统",
    items: [
      { href: "/admin/ai-monitor", label: "AI 监控", icon: Sparkles },
      { href: "/admin/audit", label: "审计日志", icon: ScrollText },
    ],
  },
];

const linkBase =
  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors";

function isActive(path: string, item: NavItem): boolean {
  if (item.match) return item.match(path);
  return path === item.href || path.startsWith(`${item.href}/`);
}

export function AdminSidebarNav() {
  const path = usePathname() ?? "/admin";

  return (
    <nav className="flex flex-col gap-5 px-3 py-4" aria-label="后台主导航">
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#48484A]">
            {group.title}
          </p>
          {group.items.map((item) => {
            const active = isActive(path, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  linkBase,
                  active
                    ? "bg-[rgba(124,92,252,0.14)] text-[#C4B5FC]"
                    : "text-[#8E8E93] hover:bg-[#1A1A24] hover:text-[#F5F5F7]",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={clsx("h-[16px] w-[16px]", active ? "text-[#C4B5FC]" : "text-[#48484A]")}
                  strokeWidth={2}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
