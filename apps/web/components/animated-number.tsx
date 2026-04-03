"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

import { formatCompatibilityScore } from "@/lib/utils";

export function AnimatedNumber({
  value,
  duration = 1200,
  delay = 0,
  className,
  style,
}: {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const raw = Number(value);
  const target = Number.isFinite(raw) ? Math.round(raw) : 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;

    const timeout = setTimeout(() => {
      if (cancelled || target <= 0) {
        if (!cancelled) setDisplay(target);
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * target));
        if (progress < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return (
    <span className={className} style={style}>
      {formatCompatibilityScore(display)}
    </span>
  );
}
