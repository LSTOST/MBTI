import { cookies } from "next/headers";
import Link from "next/link";

import { HeroVisual } from "@/components/hero-visual";

export const dynamic = "force-dynamic";
import { ClearHistoryButton } from "@/features/home/clear-history-button";
import { listReports } from "@/features/report/repository";

const USER_COOKIE = "mbti_uid";

export default async function LandingPage() {
  const jar = await cookies();
  const userId = jar.get(USER_COOKIE)?.value;
  const reports = await listReports(userId);

  return (
    <main className="relative mx-auto flex w-full max-w-[428px] flex-col bg-[#0A0A0F]">
      <div className="flex h-svh min-h-0 flex-col overflow-hidden">
        <section className="relative z-0 h-[min(42svh,300px)] w-full shrink-0 sm:h-[min(44svh,320px)]">
          <HeroVisual />
        </section>

        <section className="relative z-10 -mt-11 flex min-h-0 flex-1 flex-col items-center px-6 sm:-mt-[3.25rem]">
          {/*
            双弹簧把 header + 主操作区作为一组整体垂直居中（标题位置保持原样）；
            按钮紧跟副文案下方（原先由 flex-1 撑开的空白被按钮+人数占据），不再顶到列底。
          */}
          <div className="flex min-h-0 w-full max-w-[340px] flex-1 flex-col items-center">
            <div className="min-h-0 flex-1" aria-hidden />
            <header className="flex shrink-0 flex-col items-center">
              <h1 className="flex w-full flex-col items-center gap-2.5 text-center text-balance">
                <span className="text-[15px] font-medium leading-[1.55] tracking-[0.08em] text-[#8E8E93]">
                  测出你的
                </span>
                <span className="font-display text-[36px] font-bold leading-[1.2] tracking-[-0.02em] text-[#F5F5F7]">
                  灵魂伴侣
                </span>
              </h1>

              <p className="mt-6 w-full max-w-[300px] text-center text-balance">
                <span className="mb-3 block text-[11px] font-medium leading-[1.5] tracking-[0.14em] text-[#7C5CFC]">
                  MBTI × 星座
                </span>
                <span className="block text-[15px] font-normal leading-[1.75] text-[#8E8E93]">
                  你最容易对谁心动，又会和谁走得久远
                </span>
              </p>
            </header>

            <div className="mt-10 flex w-full shrink-0 flex-col items-center">
              <Link
                href="/start"
                className="inline-flex h-[56px] w-full max-w-[311px] items-center justify-center rounded-[24px] bg-[#7C5CFC] text-[17px] font-semibold text-[#F5F5F7] transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C5CFC] active:scale-[0.98]"
                style={{ boxShadow: "0 0 24px rgba(124, 92, 252, 0.25)" }}
              >
                开始测试
              </Link>
              <p className="mt-3.5 text-center text-[12px] leading-[1.6] text-[#48484A]">
                已有 12,580 人完成测试
              </p>
              {reports.length > 0 ? (
                <a
                  href="#history"
                  className="mt-5 flex items-center gap-1 text-[13px] leading-normal text-[#8E8E93] transition-colors active:text-[#F5F5F7]"
                >
                  <span>查看历史记录</span>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="translate-y-px">
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </a>
              ) : null}
            </div>
            <div className="min-h-0 flex-1" aria-hidden />
          </div>
        </section>
      </div>

      <section
        id="history"
        aria-label="历史记录"
        className="w-full px-6 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-0"
      >
        {reports.length > 0 && (
          <>
            <div className="w-full pt-8 pb-8">
              <div
                className="mx-auto h-px w-full"
                style={{ background: "linear-gradient(90deg, transparent, rgba(124,92,252,0.2), transparent)" }}
              />
            </div>
            <div className="flex flex-col gap-3">
              {reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/report/${r.slug}`}
                  className="flex items-center justify-between rounded-2xl bg-[#111118] px-4 py-4 transition-colors active:bg-[#1A1A24]"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-semibold tracking-wide text-[#F5F5F7]">{r.mbtiType}</span>
                      <span className="text-[13px] text-[#48484A]">·</span>
                      <span className="text-[13px] text-[#8E8E93]">{r.sunSign}</span>
                    </div>
                    <span className="text-[12px] text-[#48484A]">
                      {r.nickname} · {new Date(r.createdAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                    </span>
                  </div>
                  <svg
                    className="h-5 w-5 shrink-0 text-[#48484A]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              ))}
            </div>
            <div className="mt-6 flex justify-center pb-2">
              <ClearHistoryButton />
            </div>
          </>
        )}
      </section>

      <footer className="flex justify-center gap-6 px-6 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-2 text-[12px] text-[#48484A]">
        <Link href="/privacy" className="transition-colors active:text-[#8E8E93]">
          隐私政策
        </Link>
        <Link href="/terms" className="transition-colors active:text-[#8E8E93]">
          用户协议
        </Link>
      </footer>
    </main>
  );
}
