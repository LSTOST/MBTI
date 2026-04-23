import Link from "next/link";

import { PageHeader } from "@/features/admin/ui/page-header";
import { StatCard } from "@/features/admin/ui/stat-card";
import { Badge, type BadgeTone } from "@/features/admin/ui/badge";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Overview = {
  startedCount: number;
  submittedCount: number;
  paidCount: number;
  revenueYuan: string;
  completionRate: string;
  paymentRate: string;
};

async function loadOverview(): Promise<{ data: Overview | null; error: string | null }> {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [startedCount, submittedCount, paidCount, revenueAgg] = await Promise.all([
      prisma.quizAttempt.count({ where: { startedAt: { gte: since } } }),
      prisma.report.count({ where: { createdAt: { gte: since } } }),
      prisma.order.count({ where: { status: "paid", paidAt: { gte: since } } }),
      prisma.order.aggregate({
        _sum: { amount: true },
        where: { status: "paid", paidAt: { gte: since } },
      }),
    ]);

    const revenueCents = revenueAgg._sum.amount ?? 0;
    const revenueYuan = (revenueCents / 100).toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const completionRate =
      startedCount > 0 ? `${((submittedCount / startedCount) * 100).toFixed(1)}%` : "—";
    const paymentRate =
      submittedCount > 0 ? `${((paidCount / submittedCount) * 100).toFixed(1)}%` : "—";

    return {
      data: {
        startedCount,
        submittedCount,
        paidCount,
        revenueYuan,
        completionRate,
        paymentRate,
      },
      error: null,
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "数据加载失败",
    };
  }
}

export default async function AdminDashboardPage() {
  const { data, error } = await loadOverview();

  const live: { tone: BadgeTone; label: string } = error
    ? { tone: "danger", label: "Error" }
    : { tone: "success", label: "Live" };

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-8 md:px-8">
      <PageHeader
        title="数据总览"
        description="展示近 7 日核心指标与快捷入口"
        meta={<>数据来源：Prisma（实时）· PostHog 分析看板仍在接入</>}
      />

      {error ? (
        <p className="rounded-xl bg-[rgba(255,69,58,0.08)] px-4 py-3 text-[13px] text-[#FF453A] ring-1 ring-[rgba(255,69,58,0.24)]">
          加载失败：{error}
        </p>
      ) : null}

      <section aria-label="核心指标" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="近 7 日答题"
          value={data ? data.startedCount.toLocaleString("zh-CN") : "—"}
          hint="QuizAttempt 开始次数"
          badge={<Badge tone={live.tone}>{live.label}</Badge>}
        />
        <StatCard
          label="完成率"
          value={data ? data.completionRate : "—"}
          hint={data ? `${data.submittedCount} / ${data.startedCount}` : "submitted / started"}
          badge={<Badge tone={live.tone}>{live.label}</Badge>}
        />
        <StatCard
          label="付费转化"
          value={data ? data.paymentRate : "—"}
          hint={data ? `${data.paidCount} / ${data.submittedCount}` : "paid / submitted"}
          badge={<Badge tone={live.tone}>{live.label}</Badge>}
        />
        <StatCard
          label="近 7 日营收"
          value={data ? `¥${data.revenueYuan}` : "—"}
          hint="已支付订单累计金额"
          badge={<Badge tone={live.tone}>{live.label}</Badge>}
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
