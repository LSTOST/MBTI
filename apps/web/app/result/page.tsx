import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FreeResultView } from "@/features/report/free-result-view";
import { getReportRecord, getReportView } from "@/features/report/repository";
import { buildMbtiTags } from "@/features/quiz/scoring";

type SearchParams = Promise<{ id?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { id } = await searchParams;
  if (!id) return {};
  const rec = await getReportRecord(id);
  if (!rec) return {};
  const bm = rec.bestMatch;
  const z = bm.zodiac ? ` · ${bm.zodiac}` : "";
  const desc = `我的最佳匹配是 ${bm.mbti}${z}，来测测你的`;
  return {
    title: `我是 ${rec.mbtiType} | ${rec.loveStyleLabel} · 灵魂伴侣报告`,
    description: desc,
    openGraph: {
      title: `我是 ${rec.mbtiType} | ${rec.loveStyleLabel} · 灵魂伴侣报告`,
      description: desc,
      type: "article",
    },
  };
}

function shortenTrait(text: string, max = 12) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default async function FreeResultPage({ searchParams }: { searchParams: SearchParams }) {
  const { id } = await searchParams;
  if (!id) {
    notFound();
  }

  const view = await getReportView(id);
  if (!view) {
    notFound();
  }

  const record = await getReportRecord(id);
  const nickname = record?.nickname ?? "星友";
  const report = view.ruleReport;
  const paid = view.hasPaid;

  const loveTraits = buildMbtiTags(report.mbtiType).map((t) => shortenTrait(t, 14));

  const bm = report.bestMatch;
  const matchTitle =
    bm.zodiac != null && bm.zodiac.length > 0
      ? `${bm.zodiac} 气质`
      : shortenTrait(bm.summary, 18);

  return (
    <FreeResultView
      reportId={id}
      paid={paid}
      nickname={nickname}
      mbti={report.mbtiType}
      zodiac={report.sunSign}
      lovePersonality={report.loveStyleLabel}
      loveTraits={loveTraits}
      bestMatch={{
        mbti: bm.mbti,
        title: matchTitle,
        compatibility: bm.score,
        reason: bm.summary,
      }}
    />
  );
}
