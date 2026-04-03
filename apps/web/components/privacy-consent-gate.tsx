"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";

const STORAGE_KEY = "mbti_privacy_ok";
const PRIVACY_EVENT = "mbti-privacy-ok";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener(PRIVACY_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(PRIVACY_EVENT, handler);
  };
}

function getServerSnapshot() {
  return false;
}

function getClientSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

/** PRD 21.2：首次使用前隐私同意 */
export function PrivacyConsentGate({ children }: { children: ReactNode }) {
  const accepted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const agree = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(PRIVACY_EVENT));
  }, []);

  if (accepted) {
    return children;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[200] flex flex-col justify-end bg-black/70 px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-8 backdrop-blur-sm"
        role="dialog"
        aria-modal
        aria-labelledby="privacy-gate-title"
      >
        <div className="mx-auto w-full max-w-[400px] rounded-2xl bg-[#111118] px-5 py-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <h2 id="privacy-gate-title" className="text-[18px] font-semibold text-[#F5F5F7]">
            隐私与数据说明
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[#8E8E93]">
            为生成 MBTI 与星座报告，我们会收集昵称、性别、出生日期与答题结果，用于计算与展示；不向第三方出售原始答题数据。详见
            <Link href="/privacy" className="text-[#7C5CFC] underline-offset-2 hover:underline">
              《隐私政策》
            </Link>
            与
            <Link href="/terms" className="text-[#7C5CFC] underline-offset-2 hover:underline">
              《用户协议》
            </Link>
            。
          </p>
          <button
            type="button"
            onClick={agree}
            className="mt-6 flex h-[52px] w-full items-center justify-center rounded-[24px] bg-[#7C5CFC] text-[16px] font-semibold text-[#F5F5F7]"
          >
            同意并继续
          </button>
        </div>
      </div>
      <div className="pointer-events-none opacity-30">{children}</div>
    </>
  );
}
