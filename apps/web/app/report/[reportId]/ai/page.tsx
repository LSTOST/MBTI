import { notFound, redirect } from "next/navigation";

import { Reveal, ScaleIn } from "@/components/reveal";
import { AiReportChrome } from "@/features/report/ai-report-chrome";
import { getReportView } from "@/features/report/repository";
import { getMbtiContent, getZodiacContent, type ContentSection } from "@/lib/content";
import type { AiAnalysisSection } from "@/lib/types";

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
    redirect(`/report/${reportId}`);
  }

  const report = view.ruleReport;

  const mbtiSections = getMbtiContent(report.mbtiType);
  const zodiacSections = getZodiacContent(report.sunSign);
  const allSections = [...mbtiSections, ...zodiacSections];
  const sections: AiAnalysisSection[] = allSections.map((s: ContentSection, i) => ({
    key: `section-${i}`,
    title: s.title,
    content: s.paragraphs.join("\n\n"),
    bullets: s.bullets,
    example: s.example,
  }));
  const summary = `基于你的 ${report.mbtiType} 人格与 ${report.sunSign} 的深度解读，以下为灵魂伴侣关系全景报告。`;
  const nickname = view.nickname.trim() || "你";
  const loveStyleCore = report.loveStyleLabel.replace(report.sunSign, "");
  const depthHeroTitle = `${nickname}：${loveStyleCore}`;

  return (
    <AiReportChrome reportId={reportId}>
      {/* ── 开篇引言 ── */}
      <section className="ai-depth-hero relative px-6 pb-16 pt-8">
        <EpigraphGlow />

        <ScaleIn className="relative z-10 flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <span className="ai-depth-muted text-[11px] tracking-[0.3em] uppercase">
              灵魂伴侣 · 深度报告
            </span>
            <span className="ai-depth-border h-px flex-1 bg-[rgba(255,255,255,0.06)]" />
          </div>

          <div className="flex flex-col gap-3">
            <p className="ai-depth-accent font-display text-[13px] font-medium tracking-wide text-[#7C5CFC]">
              {report.mbtiType} · {report.sunSign}
            </p>
            <h1 className="text-[28px] font-bold leading-[1.3] text-[#F5F5F7]">
              {depthHeroTitle}
            </h1>
          </div>

          <blockquote className="ai-depth-border border-l-2 border-[#7C5CFC] pl-5">
            <p className="ai-depth-text text-[15px] leading-[1.8] text-[#8E8E93]">{summary}</p>
          </blockquote>
        </ScaleIn>
      </section>

      {/* ── 正文段落 ── */}
      {sections.map((section, i) => (
        <section
          key={section.key}
          className={`ai-depth-section px-6 py-16 ${i % 2 === 0 ? "bg-[#111118]" : "bg-[#0A0A0F]"}`}
        >
          <Reveal>
            <SectionBlock
              number={String(i + 1).padStart(2, "0")}
              section={section}
            />
          </Reveal>
        </section>
      ))}

      {/* ── 尾声 ── */}
      <section
        className={`ai-depth-section px-6 pb-[calc(env(safe-area-inset-bottom,24px)+24px)] pt-16 ${
          sections.length % 2 === 0 ? "bg-[#111118]" : "bg-[#0A0A0F]"
        }`}
      >
        <Reveal>
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="ai-depth-border h-px w-12 bg-[rgba(255,255,255,0.06)]" />
            <p className="ai-depth-muted max-w-[280px] text-[15px] leading-[1.8] text-[#8E8E93]">
              以上解读基于你的人格画像与灵魂伴侣测评结论生成，仅供关系风格参考。
            </p>
          </div>
        </Reveal>
      </section>
    </AiReportChrome>
  );
}

function EpigraphGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden print:hidden" aria-hidden>
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

function SectionBlock({ number, section }: { number: string; section: AiAnalysisSection }) {
  const { title, content, bullets, example } = section;
  const paragraphs = content.split(/\n+/).map((p) => p.trim()).filter(Boolean);

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="ai-depth-muted font-mono text-[11px] text-[#48484A]">{number}</span>
        <h2 className="text-[22px] font-semibold leading-[1.35] text-[#F5F5F7]">{title}</h2>
      </div>

      <div className="flex flex-col gap-5">
        {paragraphs.map((p, i) => (
          <p key={`${number}-p-${i}`} className="ai-depth-text text-[15px] leading-[1.85] text-[#8E8E93]">
            {p}
          </p>
        ))}

        {bullets && bullets.length > 0 ? (
          <ul className="mt-1 list-disc space-y-2.5 pl-5 marker:text-[#7C5CFC]">
            {bullets.map((b, j) => (
              <li key={`${number}-b-${j}`} className="ai-depth-text text-[15px] leading-[1.7] text-[#E8E8ED]">
                {b}
              </li>
            ))}
          </ul>
        ) : null}

        {example ? (
          <div className="ai-depth-border mt-2 border-l-2 border-[#7C5CFC] pl-4">
            <p className="ai-depth-muted text-[11px] font-medium tracking-wide text-[#48484A]">沟通示例</p>
            <p className="ai-depth-text mt-2 text-[14px] leading-[1.75] text-[#8E8E93]">{example}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
