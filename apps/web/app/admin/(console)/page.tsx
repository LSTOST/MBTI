import Link from "next/link";

import { PageHeader } from "@/features/admin/ui/page-header";
import { StatCard } from "@/features/admin/ui/stat-card";
import { Badge } from "@/features/admin/ui/badge";

export const dynamic = "force-dynamic";

/**
 * Dashboard 骨架页 —— 指标卡 + 快速入口。
 * 真实数据会在 P1/P4 阶段分别接入（测试指标 / 埋点分析）。
 */
export default function AdminDashboardPage() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-8 md:px-8">
      <PageHeader
        title="数据总览"
        description="展示指标骨架与快捷入口"
        meta={<>数据来源：Prisma · PostHog（接入中）</>}
      />

      <section aria-label="核心指标" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="近 7 日答题"
          value="—"
          hint="started_quiz 事件数"
          badge={<Badge tone="neutral">Pending</Badge>}
        />
        <StatCard
          label="完成率"
          value="—"
          hint="submitted / started"
          badge={<Badge tone="neutral">Pending</Badge>}
        />
        <StatCard
          label="付费转化"
          value="—"
          hint="paid / submitted"
          badge={<Badge tone="neutral">Pending</Badge>}
        />
        <StatCard
          label="近 7 日营收"
          value="—"
          hint="订单累计金额（分）"
          badge={<Badge tone="neutral">Pending</Badge>}
        />
      </section>

      <section
        aria-label="快速入口"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <QuickLink
          href="/admin/tests"
          title="测试管理"
          desc="维护测试模板、题目与计分策略"
        />
        <QuickLink
          href="/admin/redemption"
          title="兑换码批次"
          desc="批量发码、追踪核销、导出 CSV"
        />
        <QuickLink
          href="/admin/coupons"
          title="优惠码"
          desc="创建与管理支付流程内的抵扣券"
        />
        <QuickLink
          href="/admin/orders"
          title="订单"
          desc="查看订单状态、支付时间线、异常兜底"
        />
        <QuickLink
          href="/admin/analytics"
          title="分析"
          desc="漏斗、留存、事件趋势（PostHog 数据源）"
        />
        <QuickLink
          href="/admin/audit"
          title="审计日志"
          desc="关键操作留痕，用于合规回溯"
        />
      </section>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-2xl bg-[#111118] px-5 py-4 ring-1 ring-[#1A1A24] transition-colors hover:bg-[#15151d] hover:ring-[#2A2A36]"
    >
      <span className="text-[15px] font-semibold text-[#F5F5F7] group-hover:text-white">
        {title}
      </span>
      <span className="text-[12.5px] leading-relaxed text-[#8E8E93]">{desc}</span>
    </Link>
  );
}
