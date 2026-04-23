"use client";

import { Check, Lock, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

const WECHAT_OA_NAME = "知我实验室";
const WECHAT_REPLY_KEYWORD = "兑换码";
const DEFAULT_QR_PATH = "/qrcode_for_258.jpg";

/** 兑换弹窗主内容列宽：与公众号卡、输入区同宽，保证左缘与居中轴一致 */
const redeemColumnClass = "w-full max-w-[220px]";

const BENEFITS = [
  "AI 长文：核心需求、冲突何来与关系推进",
  "情景与沟通：雷区、话术与可执行建议",
  "基于你的 MBTI 与进阶子人格，非模板鸡汤",
] as const;

/** 兑换解锁弹窗专用：不提 AI；每条控制在单行内展示 */
const REDEEM_BENEFITS = [
  "核心需求与关系卡点一次说清",
  "踩坑讲透，沟通与推进可直接照做",
  "按人格与进阶测试定制，不说套话",
] as const;

const primaryPayBtn =
  "mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[9999px] bg-[#7C5CFC] text-[16px] font-semibold text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.25)] transition-transform active:scale-[0.98] disabled:opacity-60";

const primaryRedeemBtn =
  "mt-2 flex h-[44px] w-full shrink-0 items-center justify-center rounded-[20px] bg-[#7C5CFC] text-[15px] font-semibold text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.25)] transition-transform active:scale-[0.98] disabled:opacity-60";

function qrSrc(): string {
  const p = process.env.NEXT_PUBLIC_WECHAT_OA_QR_PATH?.trim();
  return p && p.startsWith("/") ? p : DEFAULT_QR_PATH;
}

type PaymentProps = {
  mode: "payment";
  open: boolean;
  onClose: () => void;
  paying: boolean;
  onPaymentUnlock: () => void;
  error?: string;
  advancedComplete?: boolean;
};

type RedeemProps = {
  mode: "redeem";
  open: boolean;
  onClose: () => void;
  reportId: string;
  onRedeemSuccess: () => void;
};

export type UnlockDeepReportModalProps = PaymentProps | RedeemProps;

function PaywallBody({
  onPaymentUnlock,
  paying,
  error,
  advancedComplete,
  titleId,
}: Omit<PaymentProps, "open" | "onClose" | "mode"> & { titleId: string }) {
  return (
    <div className="pr-6">
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(124,92,252,0.18)]"
          aria-hidden
        >
          <Lock className="h-6 w-6 text-[#7C5CFC]" strokeWidth={1.75} />
        </div>
        <h3 id={titleId} className="text-[20px] font-semibold leading-tight tracking-tight text-[#F5F5F7]">
          解锁深度报告
        </h3>
        <p className="mt-2 max-w-[280px] text-[13px] leading-snug text-[#8E8E93]">
          {advancedComplete ? "进阶已完成 · " : ""}
          在灵魂伴侣报告的基础上，为你生成 AI 深度解读与可执行建议
        </p>
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {BENEFITS.map((line) => (
          <li key={line} className="flex gap-2.5 text-left">
            <span
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(52,199,89,0.16)]"
              aria-hidden
            >
              <Check className="h-2.5 w-2.5 text-[#34C759]" strokeWidth={3} />
            </span>
            <span className="min-w-0 text-[13px] leading-snug text-[#E8E8ED]">{line}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onPaymentUnlock}
        disabled={paying}
        className={primaryPayBtn}
      >
        {paying ? (
          "正在处理…"
        ) : (
          <>
            <span className="text-[14px] font-medium text-[#C4B5FC] line-through decoration-[#8E8E93]">
              ¥29.90
            </span>
            <span className="text-[16px]">¥9.90</span>
            <span>立即解锁</span>
          </>
        )}
      </button>

      <p className="mt-2.5 text-center text-[10px] leading-snug text-[#48484A]">
        支持微信与支付宝；支付完成后返回本页即可查看深度报告。
      </p>

      {error ? (
        <p className="mt-2 text-center text-[12px] text-[#FF453A]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RedeemBody({
  open,
  reportId,
  onRedeemSuccess,
  titleId,
  onBusyChange,
}: Omit<RedeemProps, "mode"> & {
  titleId: string;
  onBusyChange: (busy: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onBusyChange(redeeming);
  }, [redeeming, onBusyChange]);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setError("");
    setRedeeming(false);
  }, [open, reportId]);

  async function submit() {
    setError("");
    setRedeeming(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "兑换失败");
      }

      /** 深度报告走本地 markdown，兑换成功后直接跳转，不再触发 AI 生成 */
      onRedeemSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="flex flex-col items-center px-3 pb-4 pt-1">
      <header className={`${redeemColumnClass} shrink-0 text-center`}>
        <div
          className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(124,92,252,0.18)]"
          aria-hidden
        >
          <Lock className="h-5 w-5 text-[#7C5CFC]" strokeWidth={1.75} />
        </div>
        <h3
          id={titleId}
          className="text-[18px] font-semibold leading-tight tracking-tight text-[#F5F5F7]"
        >
          解锁深度报告
        </h3>
        <p className="mt-2 text-[12px] leading-relaxed text-[#8E8E93]">
          给你提供深度解读与可执行建议
        </p>
      </header>

      <div className={`mt-4 shrink-0 ${redeemColumnClass}`}>
        <ul className="flex flex-col gap-2 text-left" aria-label="深度报告包含">
          {REDEEM_BENEFITS.map((line) => (
            <li key={line} className="flex gap-2.5 text-left">
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(52,199,89,0.16)]"
                aria-hidden
              >
                <Check className="h-2.5 w-2.5 text-[#34C759]" strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1 text-[12px] leading-snug text-[#E8E8ED]">{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <section
        className={`mt-4 shrink-0 rounded-2xl bg-[#1A1A24] px-3 py-2.5 ${redeemColumnClass}`}
        aria-label="关注公众号获取兑换码"
      >
        <p className="text-center text-[12px] font-medium leading-snug text-[#F5F5F7]">
          微信关注「{WECHAT_OA_NAME}」
        </p>
        <div className="relative mx-auto mt-2.5 aspect-square w-full max-w-[124px] overflow-hidden rounded-lg bg-white">
          <Image
            src={qrSrc()}
            alt={`${WECHAT_OA_NAME}公众号二维码`}
            width={124}
            height={124}
            className="h-full w-full object-contain"
            unoptimized
          />
        </div>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-[#8E8E93]">
          回复「{WECHAT_REPLY_KEYWORD}」即可免费获得
        </p>
      </section>

      <section className={`mt-4 shrink-0 ${redeemColumnClass}`} aria-label="输入兑换码">
        <div className="w-full">
          <label className="block text-left">
            <span className="text-[11px] font-medium tracking-wide text-[#8E8E93]">输入兑换码</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="粘贴公众号内获得的兑换码"
              disabled={redeeming}
              className="mt-1.5 h-9 w-full rounded-xl border border-transparent bg-[#1A1A24] px-3 text-[14px] text-[#F5F5F7] outline-none ring-1 ring-[#2A2A36] placeholder:text-[#48484A] focus:ring-[#7C5CFC] disabled:opacity-60"
            />
          </label>

          <button type="button" onClick={() => void submit()} disabled={redeeming} className={primaryRedeemBtn}>
            {redeeming ? "正在验证…" : "验证并解锁"}
          </button>
        </div>

        <p className="mt-3 w-full shrink-0 text-center text-[10px] leading-relaxed text-[#48484A]">
          若提示兑换码无效，请核对后重试或联系客服
        </p>

        {error ? (
          <p className="mt-2 w-full shrink-0 text-center text-[12px] text-[#FF453A]" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

export function UnlockDeepReportModal(props: UnlockDeepReportModalProps) {
  const { onClose, open } = props;
  const titleId = useId();
  const [redeemBusy, setRedeemBusy] = useState(false);
  const blocking = props.mode === "payment" ? props.paying : open && redeemBusy;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !blocking) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, blocking, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-label="关闭弹层"
        onClick={() => {
          if (!blocking) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-[1] w-full rounded-[20px] bg-[#111118] shadow-[0_24px_64px_rgba(0,0,0,0.55)] ${
          props.mode === "redeem"
            ? "max-w-[340px] max-h-[min(94dvh,600px)] overflow-y-auto overscroll-contain px-0 pb-3 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "max-w-[380px] max-h-[min(88dvh,620px)] overflow-y-auto overscroll-contain px-5 pb-5 pt-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (!blocking) onClose();
          }}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#8E8E93] transition-colors hover:bg-[#1A1A24] hover:text-[#F5F5F7] active:scale-95 disabled:opacity-40"
          aria-label="关闭"
          disabled={blocking}
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
        {props.mode === "payment" ? (
          <PaywallBody
            titleId={titleId}
            paying={props.paying}
            onPaymentUnlock={props.onPaymentUnlock}
            error={props.error}
            advancedComplete={props.advancedComplete}
          />
        ) : (
          <RedeemBody
            open={open}
            titleId={titleId}
            reportId={props.reportId}
            onClose={props.onClose}
            onRedeemSuccess={props.onRedeemSuccess}
            onBusyChange={setRedeemBusy}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
