"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";

const iconBtn =
  "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-[#8E8E93] transition-colors active:text-[#F5F5F7] disabled:opacity-50";

/** 与 quiz-runner 主按钮下的「返回首页」一致 */
const homeLink =
  "text-center text-[14px] text-[#48484A] underline-offset-4 hover:text-[#8E8E93]";

type Props = {
  reportId: string;
  children: ReactNode;
};

export function AiReportChrome({ reportId, children }: Props) {
  const [busy, setBusy] = useState(false);

  const savePdf = useCallback(async () => {
    const el = document.getElementById("ai-depth-report-print-root");
    if (!el) return;

    const prevScroll = window.scrollY;
    window.scrollTo(0, 0);

    setBusy(true);
    el.classList.add("ai-pdf-capture-mode");
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png", 0.92);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;

      while (heightLeft > 0.5) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }

      pdf.save(`灵魂伴侣深度报告-${reportId.slice(0, 8)}.pdf`);
    } catch {
      window.print();
    } finally {
      el.classList.remove("ai-pdf-capture-mode");
      window.scrollTo(0, prevScroll);
      setBusy(false);
    }
  }, [reportId]);

  return (
    <main className="relative mx-auto min-h-svh w-full max-w-[428px] overflow-x-hidden bg-[#0A0A0F]">
      <header
        className="sticky top-0 z-50 flex w-full items-center justify-between bg-[#0A0A0F]/90 px-6 py-2 pt-[max(8px,env(safe-area-inset-top,0px))] backdrop-blur-sm print:hidden supports-[backdrop-filter]:bg-[#0A0A0F]/75"
        aria-label="页面导航"
      >
        <Link href={`/report/${reportId}`} aria-label="返回灵魂伴侣报告" className={iconBtn}>
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

        <Link href={`/share/${reportId}?from=depth`} aria-label="分享海报" className={iconBtn}>
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

      <div id="ai-depth-report-print-root" className="ai-depth-print-root">
        {children}
      </div>

      <div className="mt-10 flex flex-col gap-3 print:hidden px-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
        <button
          type="button"
          onClick={() => void savePdf()}
          disabled={busy}
          className="flex h-[56px] w-full items-center justify-center rounded-[24px] bg-[#7C5CFC] text-[17px] font-semibold text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.25)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "正在生成 PDF…" : "保存深度报告"}
        </button>
        <Link href="/" className={homeLink}>
          返回首页
        </Link>
      </div>
    </main>
  );
}
