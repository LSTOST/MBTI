"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { advancedQuestions } from "@/features/quiz/advanced-questions";
import { MBTI_ADVANCED_PROGRESS_KEY as progressKey } from "@/lib/mbti-storage";
import type { QuizAnswerInput } from "@/lib/types";

const TOTAL = advancedQuestions.length;
const PROGRESS_VERSION = 1;

const easeOut = [0.22, 1, 0.36, 1] as const;
const easeDefault = [0.25, 0.1, 0.25, 1] as const;

const slideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 28 : -28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? -28 : 28, opacity: 0 }),
};

const likertScale: { value: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { value: 1, label: "非常不同意" },
  { value: 2, label: "不同意" },
  { value: 3, label: "中立" },
  { value: 4, label: "同意" },
  { value: 5, label: "非常同意" },
];

function readStoredValues(): number[] {
  try {
    const cached = window.localStorage.getItem(progressKey);
    if (cached) {
      const data = JSON.parse(cached) as Record<string, unknown>;
      if (data?.v === PROGRESS_VERSION && Array.isArray(data.values)) {
        const raw = data.values as unknown[];
        return advancedQuestions.map((_, i) => {
          const n = Number(raw[i]);
          return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.trunc(n) : 0;
        });
      }
    }
  } catch { /* fallback */ }
  return Array(TOTAL).fill(0) as number[];
}

function writeValues(values: number[]) {
  const padded = advancedQuestions.map((_, i) => {
    const v = values[i];
    if (typeof v !== "number" || !Number.isFinite(v)) return 0;
    const t = Math.trunc(v);
    return t >= 1 && t <= 5 ? t : 0;
  });
  window.localStorage.setItem(progressKey, JSON.stringify({ v: PROGRESS_VERSION, values: padded }));
}

function buildAnswers(values: number[]): QuizAnswerInput[] {
  const out: QuizAnswerInput[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const v = values[i];
    if (v >= 1 && v <= 5) {
      out.push({ questionId: advancedQuestions[i].id, value: v });
    }
  }
  return out;
}

type Props = { reportId: string };

export function AdvancedQuizRunner({ reportId }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [slideDir, setSlideDir] = useState(1);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(index);
  const advanceRef = useRef<number | null>(null);
  const [values, setValues] = useState<number[]>(() => Array(TOTAL).fill(0) as number[]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = readStoredValues();
    setValues(stored);
    const first = stored.findIndex((v) => v < 1 || v > 5);
    if (first >= 0 && first < TOTAL) setIndex(first);
  }, []);

  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => () => { if (advanceRef.current) window.clearTimeout(advanceRef.current); }, []);

  const current = advancedQuestions[index];
  const currentValue = values[index];
  const progressPercent = useMemo(() => ((index + 1) / TOTAL) * 100, [index]);

  function clearAdvanceTimeout() {
    if (advanceRef.current !== null) {
      window.clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  }

  function selectValue(value: number) {
    if (submitting) return;
    if (index !== indexRef.current) return;
    clearAdvanceTimeout();

    const next = readStoredValues();
    next[index] = value;
    try { writeValues(next); } catch { setError("无法保存进度"); return; }
    setValues(next);
    setError("");

    const delay = reduceMotion ? 0 : 220;
    advanceRef.current = window.setTimeout(() => {
      advanceRef.current = null;
      const i = indexRef.current;
      if (i >= TOTAL - 1) {
        void submit(next);
        return;
      }
      const nextI = i + 1;
      indexRef.current = nextI;
      setSlideDir(1);
      setIndex(nextI);
    }, delay);
  }

  function goBack() {
    if (index !== indexRef.current) return;
    clearAdvanceTimeout();
    if (index > 0) {
      const prevI = index - 1;
      indexRef.current = prevI;
      setSlideDir(-1);
      setIndex(prevI);
      setError("");
    }
  }

  async function submit(latestValues?: number[]) {
    const vals = latestValues ?? readStoredValues();
    const answers = buildAnswers(vals);

    if (answers.length !== TOTAL) {
      const missing = vals.findIndex((v) => v < 1 || v > 5);
      if (missing >= 0 && missing !== index) {
        setSlideDir(missing < index ? -1 : 1);
        setIndex(missing);
        setError(`第 ${missing + 1} 题未作答，请重新选择。`);
      } else {
        setError(`还有 ${TOTAL - answers.length} 题未作答。`);
      }
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/reports/${reportId}/advanced`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "提交失败");

      window.localStorage.removeItem(progressKey);
      router.push(`/report/${reportId}#module-06`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败");
      setSubmitting(false);
    }
  }

  const slideTransition = reduceMotion ? { duration: 0 } : { duration: 0.3, ease: easeDefault };

  return (
    <main className="relative mx-auto flex min-h-svh w-full max-w-[428px] flex-col overflow-hidden bg-[#0A0A0F]">
      <header className="sticky top-0 z-10 bg-[#0A0A0F]">
        <div className="flex h-11 items-center justify-between px-4">
          <Link
            href={`/report/${reportId}`}
            onClick={() => clearAdvanceTimeout()}
            aria-label="返回报告"
            className="-ml-2 flex h-10 w-10 items-center justify-center text-[#8E8E93] active:opacity-60"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-medium tracking-widest text-[#7C5CFC]">进阶测试</span>
            <span className="text-[12px] font-normal tracking-wide text-[#48484A]">
              {index + 1} / {TOTAL}
            </span>
          </div>
          <div className="w-10" aria-hidden />
        </div>
        <div className="mx-4 h-[2px] bg-[#1A1A24]">
          <motion.div
            className="h-full bg-[#7C5CFC]"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: reduceMotion ? 0 : 0.32, ease: easeOut }}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-6 pb-[calc(env(safe-area-inset-bottom,24px)+24px)] pt-4">
        <AnimatePresence mode="wait" custom={slideDir}>
          <motion.div
            key={current.id}
            custom={slideDir}
            variants={reduceMotion ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } } : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex min-h-0 flex-1 flex-col justify-center">
              <div className="flex flex-col items-center">
                <h1 className="max-w-[320px] text-balance text-center text-[24px] font-semibold leading-[1.4] text-[#F5F5F7]">
                  {current.prompt}
                </h1>
              </div>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: easeDefault, delay: reduceMotion ? 0 : 0.04 }}
                className="mt-8 grid w-full max-w-[340px] grid-cols-5 gap-2 self-center"
              >
                {likertScale.map(({ value, label }) => {
                  const isSelected = currentValue === value;
                  return (
                    <motion.button
                      key={value}
                      type="button"
                      disabled={submitting}
                      onClick={() => selectValue(value)}
                      whileTap={reduceMotion || submitting ? undefined : { scale: 0.95 }}
                      className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-colors duration-200 ${
                        isSelected
                          ? "bg-[rgba(124,92,252,0.14)] ring-1 ring-[#7C5CFC]/35"
                          : "bg-[#111118] active:bg-[#1A1A24]"
                      } ${submitting ? "opacity-50" : ""}`}
                    >
                      <span className={`text-[18px] font-semibold tabular-nums ${isSelected ? "text-[#7C5CFC]" : "text-[#F5F5F7]"}`}>
                        {value}
                      </span>
                      <span className={`text-center text-[9px] font-medium leading-[1.25] ${isSelected ? "text-[#C4B5FD]" : "text-[#48484A]"}`}>
                        {label}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>

            <div className="shrink-0 pt-6">
              <div className="flex flex-col items-center gap-2">
                {index > 0 ? (
                  <button type="button" onClick={goBack} disabled={submitting} className="text-[14px] font-medium text-[#8E8E93] underline decoration-[#48484A] underline-offset-4 transition active:opacity-70 disabled:opacity-40">
                    上一题
                  </button>
                ) : (
                  <span className="text-[12px] text-[#48484A]">进阶测试第 1 题</span>
                )}
              </div>

              <AnimatePresence>
                {error ? (
                  <motion.div key={error} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="mt-6 flex flex-col items-center gap-4">
                    <p className="text-center text-[13px] text-[#FF453A]">{error}</p>
                    {index === TOTAL - 1 ? (
                      <button type="button" onClick={() => void submit()} disabled={submitting} className="rounded-full bg-[#7C5CFC] px-6 py-2.5 text-[14px] font-semibold text-[#F5F5F7] shadow-[0_0_20px_rgba(124,92,252,0.2)] disabled:opacity-50">
                        重试提交
                      </button>
                    ) : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {submitting ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[428px] bg-gradient-to-t from-[#0A0A0F] from-40% to-transparent px-6 pb-[calc(env(safe-area-inset-bottom,24px)+16px)] pt-8">
            <p className="text-center text-[14px] font-medium text-[#8E8E93]">正在生成进阶报告…</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
