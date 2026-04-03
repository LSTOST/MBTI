"use client";

import { Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { analyticsEvents, trackEvent } from "@/lib/analytics";
import { pollPaymentOrderPaid } from "@/lib/payment-poll";

export type FreeResultViewProps = {
  reportId: string;
  paid: boolean;
  nickname: string;
  mbti: string;
  zodiac: string;
  lovePersonality: string;
  loveTraits: string[];
  bestMatch: {
    mbti: string;
    title: string;
    compatibility: number;
    reason: string;
  };
};

export function FreeResultView({
  reportId,
  paid,
  nickname,
  mbti,
  zodiac,
  lovePersonality,
  loveTraits,
  bestMatch,
}: FreeResultViewProps) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  async function unlockReport() {
    setPaying(true);
    setPayError("");
    trackEvent(analyticsEvents.clickedPay, { reportId });

    try {
      const response = await fetch(`/api/reports/${reportId}/pay`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        code?: string;
        orderId?: string;
      };

      if (response.status === 402 && payload.code === "PAYMENT_GATEWAY_REQUIRED" && payload.orderId) {
        const cfgRes = await fetch(`/api/reports/${reportId}/payment/config`);
        const cfg = (await cfgRes.json()) as { checkoutUrl?: string | null };
        if (cfg.checkoutUrl) {
          const url = cfg.checkoutUrl.replace(/\{\{reportId\}\}/g, reportId).replace(/\{\{orderId\}\}/g, payload.orderId);
          window.location.assign(url);
          return;
        }
        setPayError("正在确认支付结果…");
        const ok = await pollPaymentOrderPaid(payload.orderId);
        if (!ok) {
          throw new Error("支付确认超时，请稍后在报告页重试或联系客服");
        }
        trackEvent(analyticsEvents.paidReport, { reportId, orderId: payload.orderId });
        router.push(`/report/${reportId}`);
        router.refresh();
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error || "支付失败");
      }
      trackEvent(analyticsEvents.paidReport, { reportId });
      router.push(`/report/${reportId}`);
      router.refresh();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "支付失败");
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="relative mx-auto min-h-svh w-full max-w-[428px] overflow-hidden bg-[#0A0A0F]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 40% at 50% 0%, rgba(124, 92, 252, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 80% 30% at 50% 100%, rgba(124, 92, 252, 0.06) 0%, transparent 40%)
          `,
        }}
      />

      <div className="relative z-10 px-6 pb-40 pt-12">
        <p className="mb-2 text-center text-[12px] tracking-wider text-[#48484A]">
          {nickname} · {zodiac}
        </p>

        <section className="mb-8 text-center">
          <h1
            className="mb-4 text-[72px] font-bold leading-none tracking-[0.08em] text-[#F5F5F7]"
            style={{ textShadow: "0 0 40px rgba(124, 92, 252, 0.3)" }}
          >
            {mbti}
          </h1>

          <div className="inline-flex items-center justify-center rounded-full bg-[rgba(124,92,252,0.12)] px-5 py-2.5">
            <span className="text-[15px] font-medium text-[#7C5CFC]">{lovePersonality}</span>
          </div>
        </section>

        <section className="mb-10 flex flex-wrap justify-center gap-2">
          {loveTraits.map((trait) => (
            <span
              key={trait}
              className="rounded-full bg-[#1A1A24] px-3 py-1.5 text-[12px] leading-snug text-[#F5F5F7] sm:text-[13px]"
            >
              {trait}
            </span>
          ))}
        </section>

        <div className="mb-8 h-px bg-[rgba(255,255,255,0.06)]" />

        <section className="mb-6">
          <p className="mb-4 text-center text-[12px] tracking-wider text-[#48484A]">最佳匹配类型</p>

          <div className="rounded-2xl bg-[#111118] p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <span className="text-[22px] font-bold tracking-wide text-[#F5F5F7] sm:text-[28px]">
                  {bestMatch.mbti}
                </span>
                <span className="truncate text-[13px] text-[#8E8E93] sm:text-[14px]">{bestMatch.title}</span>
              </div>
              <div className="flex shrink-0 items-baseline gap-1">
                <span className="text-[22px] font-semibold text-[#7C5CFC] sm:text-[24px]">
                  {bestMatch.compatibility}
                </span>
                <span className="text-[12px] text-[#48484A]">%</span>
              </div>
            </div>

            <div className="mb-4 h-1 overflow-hidden rounded-full bg-[#1A1A24]">
              <div
                className="h-full rounded-full bg-[#7C5CFC]"
                style={{
                  width: `${Math.min(100, Math.max(0, bestMatch.compatibility))}%`,
                  boxShadow: "0 0 8px rgba(124, 92, 252, 0.5)",
                }}
              />
            </div>

            <p className="text-[13px] leading-[1.6] text-[#8E8E93]">{bestMatch.reason}</p>
          </div>
        </section>

        {payError ? <p className="text-center text-[13px] text-[#FF453A]">{payError}</p> : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 mx-auto max-w-[428px] bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F] to-transparent px-6 pb-[calc(env(safe-area-inset-bottom,24px)+12px)] pt-4">
        {!paid ? (
          <button
            type="button"
            onClick={() => void unlockReport()}
            disabled={paying}
            className="h-[56px] w-full rounded-[24px] bg-[#7C5CFC] text-[17px] font-semibold text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.25)] transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {paying ? "正在确认支付…" : "解锁完整报告"}
          </button>
        ) : (
          <Link
            href={`/report/${reportId}`}
            className="flex h-[56px] w-full items-center justify-center rounded-[24px] bg-[#7C5CFC] text-[17px] font-semibold text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.25)] transition-transform active:scale-[0.98]"
          >
            查看完整报告
          </Link>
        )}

        <Link
          href={`/share/${reportId}`}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 text-[#48484A] transition-colors active:text-[#8E8E93]"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          <span className="text-[13px]">分享给好友</span>
        </Link>
      </div>
    </main>
  );
}
