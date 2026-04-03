import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { Reveal, ScaleIn } from "@/components/reveal";
import { getReportView } from "@/features/report/repository";

type Props = {
  params: Promise<{ reportId: string }>;
};

export default async function AiReportPage({ params }: Props) {
  const { reportId } = await params;
  const view = await getReportView(reportId);

  if (!view) {
    notFound();
  }

  if (!view.hasPaid) {
    redirect(`/result?id=${reportId}`);
  }

  if (view.aiAnalysisStatus !== "completed" || !view.aiAnalysis) {
    redirect(`/report/${reportId}`);
  }

  const { sections, summary } = view.aiAnalysis;
  const report = view.ruleReport;

  return (
    <main className="relative mx-auto min-h-svh w-full max-w-[428px] overflow-hidden bg-[#0A0A0F]">
      {/* ── 开篇引言 ── */}
      <section className="relative px-6 pb-16 pt-20">
        <EpigraphGlow />

        <ScaleIn className="relative z-10 flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <span className="text-[11px] tracking-[0.3em] text-[#48484A] uppercase">
              灵魂伴侣 · 深度报告
            </span>
            <span className="h-px flex-1 bg-[rgba(255,255,255,0.06)]" />
          </div>

          <div className="flex flex-col gap-3">
            <p className="font-display text-[13px] font-medium tracking-wide text-[#7C5CFC]">
              {report.mbtiType} · {report.sunSign}
            </p>
            <h1 className="text-[28px] font-bold leading-[1.3] text-[#F5F5F7]">
              {report.loveStyleLabel}
            </h1>
          </div>

          <blockquote className="border-l-2 border-[#7C5CFC] pl-5">
            <p className="text-[15px] leading-[1.8] text-[#8E8E93]">
              {summary}
            </p>
          </blockquote>
        </ScaleIn>
      </section>

      {/* ── 正文段落 ── */}
      {sections.map((section, i) => (
        <section
          key={section.key}
          className={`px-6 py-16 ${i % 2 === 0 ? "bg-[#111118]" : "bg-[#0A0A0F]"}`}
        >
          <Reveal>
            <SectionBlock
              number={String(i + 1).padStart(2, "0")}
              title={section.title}
              content={section.content}
            />
          </Reveal>
        </section>
      ))}

      {/* ── 尾声 + 分享 ── */}
      <section className={`px-6 pb-48 pt-16 ${sections.length % 2 === 0 ? "bg-[#111118]" : "bg-[#0A0A0F]"}`}>
        <Reveal>
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="h-px w-12 bg-[rgba(255,255,255,0.06)]" />
            <p className="max-w-[280px] text-[15px] leading-[1.8] text-[#8E8E93]">
              以上解读基于你的人格画像与匹配规则生成，仅供关系风格参考。
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── 底部固定栏 ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-[428px]">
        <div className="bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/95 to-transparent px-6 pb-[calc(env(safe-area-inset-bottom,24px)+12px)] pt-6">
          <Link
            href={`/share/${reportId}`}
            className="flex h-[56px] w-full items-center justify-center rounded-[24px] bg-[#7C5CFC] text-[17px] font-semibold text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.25)] transition-transform active:scale-[0.98]"
          >
            分享我的解读
          </Link>
          <div className="mt-2 flex items-center justify-center gap-4">
            <Link
              href="/"
              className="flex h-11 items-center justify-center text-[13px] text-[#48484A] transition-colors active:text-[#8E8E93]"
            >
              返回首页
            </Link>
            <span className="text-[#1A1A24]">|</span>
            <Link
              href={`/report/${reportId}`}
              className="flex h-11 items-center justify-center text-[13px] text-[#48484A] transition-colors active:text-[#8E8E93]"
            >
              返回报告
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── 子组件 ── */

function EpigraphGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -right-16 top-8 h-[200px] w-[200px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(124,92,252,0.1) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}

function SectionBlock({
  number,
  title,
  content,
}: {
  number: string;
  title: string;
  content: string;
}) {
  const paragraphs = content.split(/\n+/).filter(Boolean);

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] text-[#48484A]">{number}</span>
        <h2 className="text-[22px] font-semibold leading-[1.35] text-[#F5F5F7]">
          {title}
        </h2>
      </div>

      <div className="flex flex-col gap-5">
        {paragraphs.map((p, i) => (
          <p
            key={`${number}-p-${i}`}
            className="text-[15px] leading-[1.85] text-[#8E8E93]"
          >
            {p}
          </p>
        ))}
      </div>
    </article>
  );
}
