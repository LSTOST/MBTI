import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AnimatedNumber } from "@/components/animated-number";
import { DimensionBar } from "@/components/dimension-bar";
import { HeroAurora } from "@/components/hero-aurora";
import { Reveal, ScaleIn } from "@/components/reveal";
import { SoulmateReveal } from "@/components/soulmate-reveal";
import { getReportView } from "@/features/report/repository";
import { ReportActions } from "@/features/report/report-actions";
import { ScrollToReportSection } from "@/features/report/scroll-to-report-section";
import type { FacetScoreItem, MbtiDimensionKey, MatchItem } from "@/lib/types";
import { formatCompatibilityScore } from "@/lib/utils";

type Props = {
  params: Promise<{ reportId: string }>;
};

export default async function ReportPage({ params }: Props) {
  const { reportId } = await params;
  const view = await getReportView(reportId);

  if (!view) {
    notFound();
  }

  if (!view.hasPaid) {
    redirect(`/result?id=${reportId}`);
  }

  const report = view.ruleReport;

  return (
    <main className="relative mx-auto min-h-svh w-full max-w-[428px] overflow-x-hidden bg-[#0A0A0F]">
      <ScrollToReportSection />
      {/* 整页 sticky：滚到报告底部时仍能点到返回 / 分享（不再放在首屏内或底部横排） */}
      <header
        className="sticky top-0 z-50 flex w-full items-center justify-between bg-[#0A0A0F]/90 px-6 py-2 pt-[max(8px,env(safe-area-inset-top,0px))] backdrop-blur-sm supports-[backdrop-filter]:bg-[#0A0A0F]/75"
        aria-label="页面导航"
      >
        <Link
          href="/"
          aria-label="返回首页"
          className="flex min-h-11 min-w-11 items-center justify-center text-[#8E8E93] transition-colors active:text-[#F5F5F7]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M16.5 5L7 12l9.5 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <Link
          href={`/share/${reportId}`}
          aria-label="分享海报"
          className="flex min-h-11 min-w-11 items-center justify-center text-[#8E8E93] transition-colors active:text-[#F5F5F7]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="18" cy="5" r="2.25" stroke="currentColor" strokeWidth="1.75" />
            <circle cx="6" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.75" />
            <circle cx="18" cy="19" r="2.25" stroke="currentColor" strokeWidth="1.75" />
            <path
              d="M8.59 13.51 15.42 17.49M15.41 6.51 8.59 10.49"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex h-svh flex-col items-center">
        <HeroAurora />

        <div className="relative z-10 flex flex-1 flex-col items-center px-6 pt-6">
          {/* Wave 1 (delay=0): 页眉 + 「你」胶囊 */}
          <ScaleIn playAfterMount className="flex flex-col items-center text-center">
            <p className="text-[11px] font-normal tracking-[0.3em] text-[#8E8E93] uppercase">
              灵魂伴侣报告
            </p>
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
          </ScaleIn>

          {/* Wave 2 (delay=0.12): 主视觉 — 灵魂伴侣是谁（分步进场 + 背后呼吸光晕） */}
          <SoulmateReveal mbti={report.bestMatch.mbti} zodiac={report.bestMatch.zodiac} delay={0.12} />

          {/* Wave 3 (delay=0.28): 次要 — 指数 + 排名 + 恋爱标签（同一视觉组） */}
          <ScaleIn playAfterMount className="mt-7 flex max-w-[300px] flex-col items-center text-center" delay={0.28}>
            <div className="flex flex-wrap items-end justify-center gap-x-1 gap-y-0">
              <AnimatedNumber
                value={report.bestMatch.score}
                delay={520}
                className="font-display text-[60px] font-bold leading-none text-[#F5F5F7]"
                style={{
                  textShadow:
                    "0 0 44px rgba(124,92,252,0.52), 0 0 88px rgba(124,92,252,0.22), 0 0 120px rgba(124,92,252,0.08)",
                }}
              />
              <span className="pb-[5px] text-[20px] font-bold leading-none text-[#8E8E93]">%</span>
              <span className="pb-[7px] text-[11px] leading-none tracking-[0.2em] text-[#48484A]">契合指数</span>
            </div>
            <span className="mt-3 inline-flex items-center rounded-full bg-[rgba(124,92,252,0.12)] px-3.5 py-1.5 text-[12px] font-medium text-[#7C5CFC]">
              在 {report.matchRank} 种搭配中排名第一
            </span>
            <p className="mt-3 text-[15px] font-medium leading-snug text-[#8E8E93]">
              {report.loveStyleLabel.replace(report.sunSign, "")}
            </p>
          </ScaleIn>

          {/* Wave 4 (delay=0.45/0.55/0.65): 三维标签条依次滑入 */}
          {report.bestMatch.dimensions && report.bestMatch.dimensions.length > 0 && (
            <div className="mt-4 flex w-full max-w-[320px] flex-col gap-2.5">
              {report.bestMatch.dimensions.map((dim, i) => (
                <ScaleIn playAfterMount key={dim.key} delay={0.45 + i * 0.1}>
                  <DimensionBar dimension={dim} index={i} />
                </ScaleIn>
              ))}
            </div>
          )}
        </div>

        <ScaleIn playAfterMount className="relative z-10 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]" delay={0.8}>
          <div className="flex flex-col items-center gap-1 text-[11px] text-[#48484A]">
            <span>向下滑动</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-bounce">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </ScaleIn>
      </section>

      {/* ── Module 01: 关系优势 ── */}
      <section className="bg-[#111118] px-6 py-16">
        <Reveal>
          <ModuleHeader number="01" title="你的关系优势" />
          <div className="mt-8 flex flex-col gap-6">
            {report.strengths.map((item, i) => (
              <NarrativeItem key={item} index={i} text={item} accentColor="#7C5CFC" />
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Module 02: 高频冲突点 ── */}
      <section className="bg-[#0A0A0F] px-6 py-16">
        <div className="mx-auto mb-12 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,69,58,0.4), transparent)" }} />
        <Reveal>
          <ModuleHeader number="02" title="高频冲突点" />
          <div className="mt-8 flex flex-col gap-6">
            {report.conflicts.map((item, i) => (
              <NarrativeItem key={item} index={i} text={item} accentColor="#FF453A" />
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Module 03: Top3 高热匹配 ── */}
      <section className="bg-[#111118] px-6 py-16">
        <Reveal>
          <ModuleHeader number="03" title="高热匹配" />
          <div className="mt-10 flex flex-col gap-12">
            {report.topMatches.map((match, i) => (
              <MatchBlock key={`top-${i}`} match={match} index={i} variant="positive" />
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Module 04: Top3 高风险吸引 ── */}
      <section className="bg-[#0A0A0F] px-6 py-16">
        <div className="mx-auto mb-12 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,159,10,0.4), transparent)" }} />
        <Reveal>
          <ModuleHeader number="04" title="高风险吸引" />
          <div className="mt-10 flex flex-col gap-12">
            {report.highRiskMatches.map((match, i) => (
              <MatchBlock key={`risk-${i}`} match={match} index={i} variant="danger" />
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Module 05: 建议 + AI CTA ── */}
      <section className="bg-[#111118] px-6 py-16">
        <Reveal>
          <ModuleHeader number="05" title="关系建议" />
          <div className="mt-8 flex flex-col gap-6">
            {report.advice.map((item, i) => (
              <NarrativeItem key={item} index={i} text={item} accentColor="#7C5CFC" />
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Module 06: 进阶测试 / 子人格 ── */}
      <section
        id="module-06"
        className={`scroll-mt-24 bg-[#0A0A0F] px-6 ${view.facetResult ? "py-16" : "pt-16 pb-8"}`}
      >
          <div className="mx-auto mb-12 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(124,92,252,0.4), transparent)" }} />
          {view.facetResult ? (
            <Reveal>
              <ModuleHeader number="06" title="你的灵魂伴侣子人格" />
              <p className="mt-3 text-[13px] leading-[1.6] text-[#48484A]">
                基于进阶测试的 12 项子维度分析
              </p>
              <FacetResultDisplay scores={view.facetResult.scores} />
            </Reveal>
          ) : (
            <Reveal>
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[11px] tracking-[0.3em] text-[#7C5CFC] uppercase">进阶测试</span>
                  <h3 className="max-w-[300px] text-[22px] font-semibold leading-[1.35] text-[#F5F5F7]">
                    解锁你的 12 项灵魂伴侣子人格
                  </h3>
                  <p className="mt-2 max-w-[300px] text-[14px] leading-[1.7] text-[#8E8E93]">
                    同样是 {report.mbtiType}，在亲密关系里的表现可以完全不同。24 道进阶题帮你看清：社交发起、情感表露、冲突处理、决策节奏等 12 个子维度的真实偏好。
                  </p>
                </div>

                <div className="flex w-full flex-col gap-4 rounded-2xl bg-[#111118] px-5 py-5 text-left">
                  {[
                    {
                      icon: "🧭",
                      text: "吵架、冷战、想靠近时总重复同一种难受？测完把你在亲密里的习惯反应说清楚，遇事少靠猜。",
                    },
                    {
                      icon: "📋",
                      text: `总觉得不像标准 ${report.mbtiType}？12 个落点帮你看清偏差在哪，少一点「我是不是有问题」。`,
                    },
                    {
                      icon: "⏱",
                      text: "怕又长又闷的测评？只有 24 道短题，不用写作文，也不用先憋出一篇自我检讨。",
                    },
                    {
                      icon: "🔓",
                      text: "四维和契合是底色；做完进阶测试，才能再往下解锁更有深度、写得更细的分析报告。",
                    },
                  ].map((row) => (
                    <div key={row.text} className="grid grid-cols-[1.5rem_1fr] items-start gap-x-3">
                      <span className="pt-[2px] text-center text-[15px] leading-none" aria-hidden>
                        {row.icon}
                      </span>
                      <p className="min-w-0 text-[14px] leading-relaxed text-[#E8E8ED]">{row.text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex w-full flex-col items-center gap-6">
                  <Link
                    href={`/quiz/advanced?reportId=${reportId}`}
                    className="flex h-[56px] w-full items-center justify-center rounded-[24px] bg-[#7C5CFC] text-[17px] font-semibold text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.25)] transition-transform active:scale-[0.98]"
                  >
                    开始进阶测试
                  </Link>
                  <p className="text-center text-[12px] leading-relaxed text-[#48484A]">
                    免费 · 约 2 分钟，完成后可解锁深度报告
                  </p>
                </div>
              </div>
            </Reveal>
          )}
        </section>

      {/* ── 底部操作区：未进阶且仍锁定时不展示付费解锁，主路径在上方进阶 ── */}
      <section className="bg-[#0A0A0F] px-6 pb-[calc(env(safe-area-inset-bottom,24px)+24px)] pt-4">
        {view.aiAnalysisStatus === "failed" && (
          <p className="mb-3 text-center text-[12px] text-[#48484A]">上次生成失败，请重试</p>
        )}
        <ReportActions
          reportId={reportId}
          aiStatus={view.aiAnalysisStatus}
          showLockedPayCta={view.aiAnalysisStatus !== "locked" || !!view.facetResult}
          advancedCompleteForPaywall={!!view.facetResult}
        />
      </section>
    </main>
  );
}

/* ── 子组件 ── */

function ModuleHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-normal tracking-[0.3em] text-[#48484A] uppercase">
        {number}
      </span>
      <h2 className="text-[22px] font-semibold leading-[1.35] text-[#F5F5F7]">
        {title}
      </h2>
    </div>
  );
}

function NarrativeItem({
  index,
  text,
  accentColor,
}: {
  index: number;
  text: string;
  accentColor: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="w-[2px] shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] text-[#48484A]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <p className="text-[15px] leading-[1.6] text-[#8E8E93]">{text}</p>
      </div>
    </div>
  );
}

function MatchBlock({
  match,
  index,
  variant,
}: {
  match: MatchItem;
  index: number;
  variant: "positive" | "danger";
}) {
  const scoreColor = variant === "positive" ? "#7C5CFC" : "#FF9F0A";
  const pillBg = variant === "positive"
    ? "rgba(124,92,252,0.12)"
    : "rgba(255,159,10,0.12)";
  const pillText = variant === "positive" ? "#7C5CFC" : "#FF9F0A";
  const pillLabel = variant === "positive" ? "高热" : "高风险";

  return (
    <div className="flex flex-col gap-4">
      {index > 0 && (
        <div className="mb-4 h-px w-full bg-[rgba(255,255,255,0.06)]" />
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[28px] font-bold leading-none text-[#F5F5F7]">
            {match.mbti}
          </span>
          {match.zodiac && (
            <span className="text-[13px] text-[#8E8E93]">{match.zodiac}</span>
          )}
        </div>
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium"
          style={{ backgroundColor: pillBg, color: pillText }}
        >
          {pillLabel}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#1A1A24]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, Math.round(match.score)))}%`,
              backgroundColor: scoreColor,
              boxShadow: `0 0 8px ${scoreColor}40`,
            }}
          />
        </div>
        <span className="font-mono text-[15px] font-semibold tabular-nums" style={{ color: scoreColor }}>
          {formatCompatibilityScore(match.score)}
        </span>
      </div>

      <p className="text-[15px] leading-[1.6] text-[#8E8E93]">{match.summary}</p>
    </div>
  );
}

const DIMENSION_LABELS: Record<MbtiDimensionKey, string> = {
  EI: "外向 — 内向",
  SN: "感觉 — 直觉",
  TF: "思考 — 情感",
  JP: "判断 — 感知",
};

function FacetResultDisplay({ scores }: { scores: FacetScoreItem[] }) {
  const grouped = new Map<MbtiDimensionKey, FacetScoreItem[]>();
  for (const s of scores) {
    const arr = grouped.get(s.dimension) ?? [];
    arr.push(s);
    grouped.set(s.dimension, arr);
  }

  const dimensions: MbtiDimensionKey[] = ["EI", "SN", "TF", "JP"];

  return (
    <div className="mt-8 flex flex-col gap-10">
      {dimensions.map((dim) => {
        const facets = grouped.get(dim);
        if (!facets?.length) return null;
        return (
          <div key={dim} className="flex flex-col gap-5">
            <h3 className="text-[13px] font-medium tracking-[0.15em] text-[#48484A] uppercase">
              {DIMENSION_LABELS[dim]}
            </h3>
            <div className="flex flex-col gap-4">
              {facets.map((f) => (
                <FacetBar key={f.facet} item={f} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FacetBar({ item }: { item: FacetScoreItem }) {
  const maxScore = 4;
  const normalized = Math.max(-maxScore, Math.min(maxScore, item.score));
  const pct = ((normalized + maxScore) / (2 * maxScore)) * 100;
  const leansRight = normalized > 0;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[14px] font-medium text-[#F5F5F7]">{item.label}</span>
      <div className="flex items-center gap-2">
        <span className="w-[52px] shrink-0 text-right text-[11px] text-[#48484A]">{item.leftPoleLabel}</span>
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[#1A1A24]">
          <div
            className="absolute top-0 h-full w-1 rounded-full bg-[#48484A]"
            style={{ left: "50%", transform: "translateX(-50%)" }}
          />
          <div
            className="absolute top-0 h-full rounded-full transition-all duration-500"
            style={{
              left: leansRight ? "50%" : `${pct}%`,
              width: `${Math.abs(pct - 50)}%`,
              backgroundColor: "#7C5CFC",
              boxShadow: "0 0 8px rgba(124,92,252,0.3)",
            }}
          />
        </div>
        <span className="w-[52px] shrink-0 text-[11px] text-[#48484A]">{item.rightPoleLabel}</span>
      </div>
    </div>
  );
}
