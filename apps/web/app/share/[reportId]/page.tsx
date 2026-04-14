import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicShareView } from "@/features/report/repository";
import { SharePosterView } from "@/features/share/share-poster-view";

/** 分享页依赖 URL 查询参数；避免整页被静态缓存后丢失 ?from= */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ reportId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reportId } = await params;
  const view = await getPublicShareView(reportId);
  if (!view) return {};
  const r = view.ruleReport;
  const bm = r.bestMatch;
  const z = bm.zodiac ? ` · ${bm.zodiac}` : "";
  const desc = `我的最佳匹配是 ${bm.mbti}${z}，来测测你的`;
  return {
    title: `我是 ${r.mbtiType} | ${r.loveStyleLabel} · 灵魂伴侣报告`,
    description: desc,
    openGraph: {
      title: `我是 ${r.mbtiType} | ${r.loveStyleLabel} · 灵魂伴侣报告`,
      description: desc,
      type: "article",
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { reportId } = await params;
  const view = await getPublicShareView(reportId);

  if (!view) {
    notFound();
  }

  return (
    <SharePosterView
      reportId={view.reportId}
      reportPathKey={view.slug || view.reportId}
      report={view.ruleReport}
    />
  );
}
