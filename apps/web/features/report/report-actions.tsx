"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { UnlockDeepReportModal } from "@/features/report/unlock-deep-report-modal";
import { analyticsEvents, trackEvent } from "@/lib/analytics";
import { pollPaymentOrderPaid } from "@/lib/payment-poll";
import { getPublicUnlockMode } from "@/lib/unlock-mode";

type Props = {
  reportId: string;
  aiStatus: "locked" | "not_started" | "processing" | "completed" | "failed";
  /** 未完成进阶时不展示「解锁深度报告」（默认 true 兼容其它调用） */
  showLockedPayCta?: boolean;
  /** 付费解锁卡片副文案：是否已做完进阶测试 */
  advancedCompleteForPaywall?: boolean;
};

const primaryBtn =
  "flex h-[56px] w-full items-center justify-center rounded-[24px] bg-[#7C5CFC] text-[17px] font-semibold text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.25)] transition-transform active:scale-[0.98] disabled:opacity-60";

/** 与 quiz-runner 主按钮下的「返回首页」一致 */
const homeLink =
  "text-center text-[14px] text-[#48484A] underline-offset-4 hover:text-[#8E8E93]";

const unlockMode = getPublicUnlockMode();

export function ReportActions({
  reportId,
  aiStatus,
  showLockedPayCta = true,
  advancedCompleteForPaywall,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [paying, setPaying] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  async function unlockAndGenerateAi() {
    setPaying(true);
    setError("");
    trackEvent(analyticsEvents.clickedPay, { reportId });

    try {
      const cfgRes = await fetch(`/api/reports/${reportId}/payment/config`);
      const cfg = (await cfgRes.json()) as {
        provider?: string;
        checkoutUrl?: string | null;
        error?: string;
      };
      if (!cfgRes.ok) {
        throw new Error(cfg.error || "无法获取支付配置");
      }

      const payRes = await fetch(`/api/reports/${reportId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payData = (await payRes.json()) as {
        error?: string;
        code?: string;
        orderId?: string;
      };

      if (payRes.status === 402 && payData.code === "PAYMENT_GATEWAY_REQUIRED" && payData.orderId) {
        if (cfg.checkoutUrl) {
          const url = cfg.checkoutUrl
            .replace(/\{\{reportId\}\}/g, reportId)
            .replace(/\{\{orderId\}\}/g, payData.orderId);
          window.location.assign(url);
          return;
        }
        setError("正在确认支付结果…");
        const ok = await pollPaymentOrderPaid(payData.orderId);
        if (!ok) {
          throw new Error("支付确认超时，请稍后再试");
        }
        trackEvent(analyticsEvents.paidReport, { reportId, orderId: payData.orderId });
        router.push(`/report/${reportId}`);
        router.refresh();
        return;
      }

      if (!payRes.ok) {
        throw new Error(payData.error || "支付失败");
      }

      trackEvent(analyticsEvents.paidReport, { reportId });
      router.push(`/report/${reportId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setPaying(false);
    }
  }

  function generateAi() {
    setError("");
    trackEvent(analyticsEvents.clickedAi, { reportId });

    startTransition(async () => {
      try {
        const res = await fetch(`/api/reports/${reportId}/ai`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "AI 生成失败");

        trackEvent(analyticsEvents.aiCompleted, { reportId });
        router.push(`/report/${reportId}/ai`);
        router.refresh();
      } catch (e) {
        trackEvent(analyticsEvents.aiFailed, { reportId });
        setError(e instanceof Error ? e.message : "AI 生成失败");
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {aiStatus === "locked" && showLockedPayCta ? (
        <>
          <button
            type="button"
            onClick={() => setPaywallOpen(true)}
            className={primaryBtn}
          >
            解锁深度报告
          </button>
          {unlockMode === "payment" ? (
            <UnlockDeepReportModal
              mode="payment"
              open={paywallOpen}
              onClose={() => {
                setPaywallOpen(false);
                setError("");
              }}
              paying={paying}
              onPaymentUnlock={() => void unlockAndGenerateAi()}
              error={error || undefined}
              advancedComplete={advancedCompleteForPaywall}
            />
          ) : (
            <UnlockDeepReportModal
              mode="redeem"
              open={paywallOpen}
              onClose={() => setPaywallOpen(false)}
              reportId={reportId}
              onRedeemSuccess={() => {
                trackEvent(analyticsEvents.redeemedWithCode, { reportId });
                trackEvent(analyticsEvents.aiCompleted, { reportId });
                router.push(`/report/${reportId}/ai`);
                router.refresh();
                setPaywallOpen(false);
              }}
            />
          )}
        </>
      ) : aiStatus === "locked" ? null : aiStatus === "completed" ? (
        <>
          <Link href={`/report/${reportId}/ai`} className={primaryBtn}>
            查看深度报告
          </Link>
          <Link href="/" className={homeLink}>
            {"< "}
            返回首页
          </Link>
        </>
      ) : aiStatus === "failed" ? (
        <button type="button" onClick={generateAi} disabled={pending} className={primaryBtn}>
          {pending ? "正在生成…" : "重试生成深度报告"}
        </button>
      ) : (
        <button type="button" onClick={generateAi} disabled={pending || aiStatus === "processing"} className={primaryBtn}>
          {pending || aiStatus === "processing" ? "正在生成…" : "生成深度报告"}
        </button>
      )}

      {error && !(aiStatus === "locked" && showLockedPayCta) ? (
        <p className="text-center text-[13px] text-[#FF453A]">{error}</p>
      ) : null}
    </div>
  );
}
