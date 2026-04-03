"use client";

import { useEffect } from "react";

const SECTION_ID = "module-06";

/** 从进阶页返回带 `#module-06` 时，滚到第 6 模块（子人格 / 进阶入口） */
export function ScrollToReportSection() {
  useEffect(() => {
    const scrollIfHash = () => {
      if (typeof window === "undefined" || window.location.hash !== `#${SECTION_ID}`) return;
      const el = document.getElementById(SECTION_ID);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    scrollIfHash();
    const t1 = window.setTimeout(scrollIfHash, 80);
    const t2 = window.setTimeout(scrollIfHash, 320);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return null;
}
