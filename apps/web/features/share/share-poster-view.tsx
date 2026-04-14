"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useState } from "react";
import { toBlob } from "html-to-image";

import { DimensionBar } from "@/components/dimension-bar";
import { HeroAurora } from "@/components/hero-aurora";
import { analyticsEvents, trackEvent } from "@/lib/analytics";
import type { CompatibilityReport } from "@/lib/types";
import { formatCompatibilityScore } from "@/lib/utils";

const QR_PUBLIC_PATH = "/peibupei.com.png";

const returnLinkClass =
  "flex h-11 w-full items-center justify-center text-[13px] text-[#48484A] transition-colors active:text-[#8E8E93]";

/** 客户端读 ?from=depth|ai，避免 RSC/静态缓存里 searchParams 为空导致总回到灵魂伴侣报告 */
function ShareReturnReportLink({ pathKey }: { pathKey: string }) {
  const sp = useSearchParams();
  const from = sp.get("from");
  const href = from === "depth" || from === "ai" ? `/report/${pathKey}/ai` : `/report/${pathKey}`;
  return (
    <Link href={href} prefetch={false} className={returnLinkClass}>
      返回报告
    </Link>
  );
}

type Props = {
  reportId: string;
  /** 用于拼接 `/report/…`：slug 优先，与 getReportView 的 id/slug 双查一致 */
  reportPathKey: string;
  report: CompatibilityReport;
};

export function SharePosterView({ reportId, reportPathKey, report }: Props) {
  const pathKey = String(reportPathKey || reportId).trim() || reportId;
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  const loveShort = report.loveStyleLabel.replace(report.sunSign, "");
  const dims = report.bestMatch.dimensions ?? [];

  const savePoster = useCallback(async () => {
    const node = captureRef.current;
    if (!node) return;

    setBusy(true);
    setHint("");
    trackEvent(analyticsEvents.clickedShare, { reportId });

    try {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

      const images = Array.from(node.querySelectorAll("img"));
      await Promise.all(
        images.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.addEventListener("load", () => resolve(), { once: true });
                  img.addEventListener("error", () => resolve(), { once: true });
                }),
        ),
      );

      const blob = await toBlob(node, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#0A0A0F",
        type: "image/png",
      });
      if (!blob) {
        throw new Error("无法生成图片");
      }
      const file = new File([blob], "灵魂伴侣海报.png", { type: "image/png" });

      const nav = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
        canShare?: (data: ShareData) => boolean;
      };

      const canFileShare =
        typeof nav.canShare === "function" &&
        nav.canShare({ files: [file] }) &&
        typeof nav.share === "function";

      if (canFileShare) {
        try {
          await nav.share({ files: [file], title: "灵魂伴侣海报" });
          trackEvent(analyticsEvents.shareSuccess, { reportId, channel: "native_share" });
          void fetch("/api/share/event", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reportId,
              shareType: "free_card",
              shareChannel: "wechat_friend",
            }),
          });
          return;
        } catch (shareErr) {
          // 关掉分享面板会抛 AbortError：不再当成异常打日志，并继续走下方下载兜底
          const aborted =
            (shareErr instanceof DOMException && shareErr.name === "AbortError") ||
            (shareErr instanceof Error && shareErr.name === "AbortError");
          if (!aborted) {
            console.warn("系统分享失败，尝试本机下载", shareErr);
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "灵魂伴侣海报.png";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      trackEvent(analyticsEvents.shareSuccess, { reportId, channel: "download" });
      void fetch("/api/share/event", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          shareType: "free_card",
          shareChannel: "screenshot",
        }),
      });

      setHint("若未保存成功，可截屏海报区域；iPhone 也可在分享面板中选「存储图像」");
    } catch (e) {
      console.error(e);
      setHint(e instanceof Error ? e.message : "导出失败，请截屏保存海报");
    } finally {
      setBusy(false);
    }
  }, [reportId]);

  return (
    <main className="relative mx-auto min-h-svh w-full max-w-[428px] overflow-x-hidden bg-[#0A0A0F] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-[calc(env(safe-area-inset-top,0px)+16px)]">
      <section ref={captureRef} className="relative overflow-hidden rounded-[24px]">
        <HeroAurora />

        <div className="relative z-10 flex flex-col items-center px-4 pb-8 pt-6">
          <p className="text-[11px] font-normal tracking-[0.3em] text-[#8E8E93] uppercase">灵魂伴侣报告</p>

          <div
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1A1A24] px-4 py-2.5"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
          >
            <span className="font-display text-[15px] font-bold tracking-[0.06em] text-[#F5F5F7]">
              {report.mbtiType}
            </span>
            <span className="text-[12px] text-[#48484A]" aria-hidden>
              ·
            </span>
            <span className="text-[14px] font-medium text-[#8E8E93]">{report.sunSign}</span>
          </div>

          <p className="mt-7 text-[13px] font-medium tracking-[0.18em] text-[#8E8E93]">你的灵魂伴侣是</p>
          <h1
            className="mt-4 font-display text-[76px] font-bold leading-[0.95] tracking-[0.06em] text-[#F5F5F7]"
            style={{ textShadow: "0 0 64px rgba(124,92,252,0.55), 0 0 120px rgba(124,92,252,0.2)" }}
          >
            {report.bestMatch.mbti}
          </h1>
          <p className="mt-3 text-[22px] font-semibold leading-tight text-[#F5F5F7]">{report.bestMatch.zodiac}</p>

          <div className="mt-6 flex max-w-[300px] flex-wrap items-end justify-center gap-x-1 gap-y-0 text-center">
            <span
              className="font-display text-[60px] font-bold leading-none text-[#F5F5F7] tabular-nums"
              style={{
                textShadow:
                  "0 0 44px rgba(124,92,252,0.52), 0 0 88px rgba(124,92,252,0.22), 0 0 120px rgba(124,92,252,0.08)",
              }}
            >
              {formatCompatibilityScore(report.bestMatch.score)}
            </span>
            <span className="pb-[5px] text-[20px] font-bold leading-none text-[#8E8E93]">%</span>
            <span className="pb-[7px] text-[11px] leading-none tracking-[0.2em] text-[#48484A]">契合指数</span>
          </div>
          <span className="mt-3 inline-flex items-center rounded-full bg-[rgba(124,92,252,0.12)] px-3.5 py-1.5 text-[12px] font-medium text-[#7C5CFC]">
            在 {report.matchRank} 种搭配中排名第一
          </span>
          <p className="mt-3 max-w-[300px] text-[15px] font-medium leading-snug text-[#8E8E93]">{loveShort}</p>

          {dims.length > 0 && (
            <div className="mt-4 flex w-full max-w-[320px] flex-col gap-2.5">
              {dims.map((dim, i) => (
                <DimensionBar key={dim.key} dimension={dim} index={i} />
              ))}
            </div>
          )}

          <div className="mt-10 flex w-full max-w-[320px] items-end justify-between gap-4 border-t border-[rgba(255,255,255,0.06)] pt-6">
            <div className="flex min-w-0 flex-col gap-1 text-left">
              <p className="text-[13px] font-medium text-[#F5F5F7]">测出你的灵魂伴侣</p>
              <p className="text-[12px] font-medium tracking-wide text-[#8E8E93]">peibupei.com</p>
              <p className="text-[11px] text-[#48484A]">扫码或长按识别</p>
            </div>
            <img
              src={QR_PUBLIC_PATH}
              alt=""
              width={72}
              height={72}
              className="h-[72px] w-[72px] shrink-0 rounded-[12px] bg-[#F5F5F7] object-contain"
            />
          </div>
        </div>
      </section>

      <div className="mt-6 flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={savePoster}
          disabled={busy}
          className="flex h-[52px] w-full items-center justify-center rounded-[24px] bg-[#7C5CFC] text-[16px] font-semibold text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.25)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "正在生成海报…" : "保存海报到相册"}
        </button>
        {hint ? <p className="text-center text-[12px] leading-normal text-[#8E8E93]">{hint}</p> : null}
        <Suspense
          fallback={
            <Link href={`/report/${pathKey}`} prefetch={false} className={returnLinkClass}>
              返回报告
            </Link>
          }
        >
          <ShareReturnReportLink pathKey={pathKey} />
        </Suspense>
      </div>
    </main>
  );
}
