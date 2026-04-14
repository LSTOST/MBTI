"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { quizQuestions } from "@/features/quiz/questions";
import { analyticsEvents, trackEvent } from "@/lib/analytics";
import { MBTI_INTAKE_KEY as intakeKey, MBTI_PROGRESS_KEY as progressKey } from "@/lib/mbti-storage";
import type { QuizAnswerInput, UserProfileInput } from "@/lib/types";

const likertScale: { value: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { value: 1, label: "非常不同意" },
  { value: 2, label: "不同意" },
  { value: 3, label: "中立" },
  { value: 4, label: "同意" },
  { value: 5, label: "非常同意" },
];

const easeOut = [0.22, 1, 0.36, 1] as const;
const easeDefault = [0.25, 0.1, 0.25, 1] as const;

const slideVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 28 : -28,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? -28 : 28,
    opacity: 0,
  }),
};

type Props = {
  profile: UserProfileInput | null;
};

const QUIZ_QUESTION_IDS = new Set(quizQuestions.map((q) => q.id));
/** v3：按题序固定长度数组 [1–5]，0 表示未答，不依赖题 id 字符串与缓存键完全一致 */
const PROGRESS_VERSION = 3;
const PROGRESS_VERSION_BY_ID = 2;

/** 仅用于迁移旧版「答案数组」 */
function toQuizAnswer(entry: unknown): QuizAnswerInput | null {
  if (!entry || typeof entry !== "object") return null;
  const rec = entry as Record<string, unknown>;
  const questionId = String(rec.questionId ?? "").trim();
  if (!QUIZ_QUESTION_IDS.has(questionId)) return null;
  const n = Number(rec.value);
  if (!Number.isFinite(n)) return null;
  const value = Math.trunc(n);
  if (value < 1 || value > 5) return null;
  return { questionId, value };
}

function valuesArrayToMap(values: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  const len = Math.min(values.length, quizQuestions.length);
  for (let i = 0; i < len; i++) {
    const raw = values[i];
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    const value = Math.trunc(n);
    if (value < 1 || value > 5) continue;
    map.set(quizQuestions[i].id, value);
  }
  return map;
}

function mapToValuesArray(map: Map<string, number>): number[] {
  return quizQuestions.map((q) => {
    const v = map.get(q.id);
    if (v === undefined || v < 1 || v > 5) return 0;
    return v;
  });
}

function progressJsonToMap(data: unknown): Map<string, number> {
  const map = new Map<string, number>();
  if (data === null || typeof data !== "object") return map;

  if (
    "v" in data &&
    (data as { v: unknown }).v === PROGRESS_VERSION &&
    "values" in data &&
    Array.isArray((data as { values: unknown }).values)
  ) {
    return valuesArrayToMap((data as { values: unknown[] }).values);
  }

  if (
    "v" in data &&
    (data as { v: unknown }).v === PROGRESS_VERSION_BY_ID &&
    "byId" in data &&
    typeof (data as { byId: unknown }).byId === "object" &&
    (data as { byId: unknown }).byId !== null &&
    !Array.isArray((data as { byId: unknown }).byId)
  ) {
    const byId = (data as { byId: Record<string, unknown> }).byId;
    for (const [key, raw] of Object.entries(byId)) {
      if (!QUIZ_QUESTION_IDS.has(key)) continue;
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      const value = Math.trunc(n);
      if (value < 1 || value > 5) continue;
      map.set(key, value);
    }
    return map;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const a = toQuizAnswer(item);
      if (a) map.set(a.questionId, a.value);
    }
    return map;
  }

  return map;
}

function readProgressMap(): Map<string, number> {
  if (typeof window === "undefined") return new Map();
  const cached = window.localStorage.getItem(progressKey);
  if (!cached) return new Map();
  try {
    return progressJsonToMap(JSON.parse(cached) as unknown);
  } catch {
    return new Map();
  }
}

function writeProgressValues(values: number[]) {
  const padded = quizQuestions.map((_, i) => {
    const v = values[i];
    if (typeof v !== "number" || !Number.isFinite(v)) return 0;
    const t = Math.trunc(v);
    return t >= 1 && t <= 5 ? t : 0;
  });
  window.localStorage.setItem(
    progressKey,
    JSON.stringify({ v: PROGRESS_VERSION, values: padded }),
  );
}

function writeProgressMap(map: Map<string, number>) {
  writeProgressValues(mapToValuesArray(map));
}

/** 直接从 localStorage 读取原始 values 数组，跳过 Map 中间层，防止转换丢数据 */
function readStoredValues(): number[] {
  try {
    const cached = window.localStorage.getItem(progressKey);
    if (cached) {
      const data = JSON.parse(cached) as Record<string, unknown>;
      if (
        data !== null &&
        typeof data === "object" &&
        data.v === PROGRESS_VERSION &&
        Array.isArray(data.values)
      ) {
        const raw = data.values as unknown[];
        return quizQuestions.map((_, i) => {
          const n = Number(raw[i]);
          return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.trunc(n) : 0;
        });
      }
    }
  } catch { /* fallback below */ }
  return mapToValuesArray(readProgressMap());
}

function orderedAnswersFromMap(map: Map<string, number>): QuizAnswerInput[] {
  const out: QuizAnswerInput[] = [];
  for (const q of quizQuestions) {
    const v = map.get(q.id);
    if (v !== undefined) {
      out.push({ questionId: q.id, value: v });
    }
  }
  return out;
}

/** 按题库顺序找第一道未答题，避免「已记录 33 题却跳到第 34 题」导致永远补不齐 */
function resumeIndexFromMap(map: Map<string, number>): number {
  for (let i = 0; i < quizQuestions.length; i++) {
    if (!map.has(quizQuestions[i].id)) {
      return i;
    }
  }
  return quizQuestions.length - 1;
}

export function QuizRunner({ profile }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [slideDir, setSlideDir] = useState(1);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(index);
  const advanceRef = useRef<number | null>(null);
  const [answers, setAnswers] = useState<QuizAnswerInput[]>([]);
  /** 与 answers 同步写入，禁止每轮 render 用 state 回写，否则会覆盖 selectValue 里更新的快照并导致提交条数变少 */
  const answersRef = useRef<QuizAnswerInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const serverAttemptIdRef = useRef<string | null>(null);

  useEffect(() => {
    const map = readProgressMap();
    const merged = orderedAnswersFromMap(map);
    answersRef.current = merged;
    setAnswers(merged);
    setIndex(resumeIndexFromMap(map));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await fetch("/api/user/init", { credentials: "include" });
      const res = await fetch("/api/quiz/progress", { credentials: "include" });
      if (!res.ok || cancelled) return;
      const remote = (await res.json()) as {
        attemptId: string;
        answers: QuizAnswerInput[];
        currentQuestionIndex: number;
      } | null;
      if (!remote?.answers?.length) return;

      const localMap = readProgressMap();
      if (localMap.size >= remote.answers.length) return;

      const ok = window.confirm("你有一份未完成的测试（24 小时内），是否从服务器继续？");
      if (!ok || cancelled) return;

      const map = new Map(remote.answers.map((a) => [a.questionId, a.value]));
      writeProgressMap(map);
      serverAttemptIdRef.current = remote.attemptId;
      const merged = orderedAnswersFromMap(map);
      answersRef.current = merged;
      setAnswers(merged);
      setIndex(resumeIndexFromMap(map));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    return () => {
      if (advanceRef.current) {
        window.clearTimeout(advanceRef.current);
      }
    };
  }, []);

  const current = quizQuestions[index];
  const currentValue = answers.find((item) => item.questionId === current.id)?.value;

  const progressPercent = useMemo(
    () => ((index + 1) / quizQuestions.length) * 100,
    [index],
  );

  const isLast = index === quizQuestions.length - 1;

  function clearAdvanceTimeout() {
    if (advanceRef.current !== null) {
      window.clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  }

  async function syncServerProgress(values: number[], currentIdx: number) {
    try {
      const map = valuesArrayToMap(values);
      const ans = orderedAnswersFromMap(map);
      const res = await fetch("/api/quiz/progress", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: serverAttemptIdRef.current,
          answers: ans,
          currentQuestionIndex: Math.min(currentIdx, quizQuestions.length - 1),
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { attemptId?: string };
      if (data.attemptId) {
        serverAttemptIdRef.current = data.attemptId;
      }
    } catch {
      /* 同步失败不阻断答题 */
    }
  }

  function selectValue(value: number) {
    if (submitting) return;
    if (index !== indexRef.current) return;

    clearAdvanceTimeout();
    if (index < 0 || index >= quizQuestions.length) return;

    const values = readStoredValues();
    values[index] = value;
    try {
      writeProgressValues(values);
    } catch {
      setError("无法保存进度，请检查浏览器存储权限或空间。");
      return;
    }
    const map = valuesArrayToMap(values);
    const nextAnswers = orderedAnswersFromMap(map);
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    setError("");

    const answeredCount = values.filter((v) => v >= 1 && v <= 5).length;
    const curIdx = index;
    const nextIdx = curIdx >= quizQuestions.length - 1 ? curIdx : curIdx + 1;
    if (answeredCount > 0 && (answeredCount % 5 === 0 || curIdx >= quizQuestions.length - 1)) {
      void syncServerProgress(values, nextIdx);
    }

    const delay = reduceMotion ? 0 : 220;

    advanceRef.current = window.setTimeout(() => {
      advanceRef.current = null;
      const i = indexRef.current;

      if (i >= quizQuestions.length - 1) {
        void submitReport();
        return;
      }

      const nextI = i + 1;
      indexRef.current = nextI;
      if (nextI === 5 || nextI === 10 || nextI === 20) {
        trackEvent(analyticsEvents.submittedQuiz, { checkpoint: nextI });
      }
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
    } else {
      router.push("/start");
    }
  }

  /** 从磁盘读最新 + 叠内存 ref 兜底，返回合并后的 values 数组 */
  function mergeAllAnswers(): number[] {
    const values = readStoredValues();
    for (const a of answersRef.current) {
      const idx = quizQuestions.findIndex((q) => q.id === a.questionId);
      if (idx >= 0 && a.value >= 1 && a.value <= 5 && (values[idx] < 1 || values[idx] > 5)) {
        values[idx] = a.value;
      }
    }
    const curQ = quizQuestions[index];
    if (curQ) {
      const cv = answers.find((x) => x.questionId === curQ.id)?.value;
      if (cv !== undefined && cv >= 1 && cv <= 5) {
        values[index] = cv;
      }
    }
    return values;
  }

  async function submitReport() {
    if (!profile) {
      setError("基础信息丢了，回去重新填。");
      return;
    }

    const values = mergeAllAnswers();
    try {
      writeProgressValues(values);
    } catch { /* best-effort */ }

    const nextAnswers = orderedAnswersFromMap(valuesArrayToMap(values));

    if (nextAnswers.length !== quizQuestions.length) {
      const firstMissing = values.findIndex((v) => v < 1 || v > 5);
      if (firstMissing >= 0 && firstMissing !== index) {
        setSlideDir(firstMissing < index ? -1 : 1);
        setIndex(firstMissing);
        setError(`第 ${firstMissing + 1} 题答案未记录，请重新选择。`);
      } else {
        setError(`还有 ${quizQuestions.length - nextAnswers.length} 题未记录，请重新选择当前题目。`);
      }
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await fetch("/api/user/init", { method: "POST", credentials: "include" });

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profile,
          answers: nextAnswers,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "生成报告失败");
      }

      trackEvent(analyticsEvents.submittedQuiz, { completed: true });
      window.localStorage.removeItem(progressKey);
      window.localStorage.removeItem(intakeKey);
      void fetch("/api/quiz/progress", { method: "DELETE", credentials: "include" });
      router.push(`/report/${payload.report.slug}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "生成报告失败");
      setSubmitting(false);
    }
  }

  const slideTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: easeDefault };

  if (!profile) {
    return (
      <motion.main
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35, ease: easeOut }}
        className="relative mx-auto flex min-h-svh w-full max-w-[428px] flex-col overflow-hidden bg-[#0A0A0F] px-6 pb-12 pt-16"
      >
        <p className="text-[15px] leading-relaxed text-[#8E8E93]">基础信息不见了，回去重填。</p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/start"
            className="inline-flex h-[52px] items-center justify-center rounded-[24px] bg-[#7C5CFC] text-[16px] font-semibold text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.25)]"
          >
            重新填写
          </Link>
          <Link
            href="/"
            className="text-center text-[14px] text-[#48484A] underline-offset-4 hover:text-[#8E8E93]"
          >
            返回首页
          </Link>
        </div>
      </motion.main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-svh w-full max-w-[428px] flex-col overflow-hidden bg-[#0A0A0F]">
      <header className="sticky top-0 z-10 bg-[#0A0A0F]">
        <div className="flex h-11 items-center justify-between px-4">
          <Link
            href="/"
            onClick={() => clearAdvanceTimeout()}
            aria-label="返回首页"
            className="-ml-2 flex h-10 w-10 items-center justify-center text-[#8E8E93] active:opacity-60"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <span className="text-[12px] font-normal tracking-wide text-[#48484A]">
            {index + 1} / {quizQuestions.length}
          </span>
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
            variants={
              reduceMotion
                ? {
                    enter: { opacity: 0 },
                    center: { opacity: 1 },
                    exit: { opacity: 0 },
                  }
                : slideVariants
            }
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
                transition={{
                  duration: reduceMotion ? 0 : 0.28,
                  ease: easeDefault,
                  delay: reduceMotion ? 0 : 0.04,
                }}
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
                      <span
                        className={`text-[18px] font-semibold tabular-nums ${
                          isSelected ? "text-[#7C5CFC]" : "text-[#F5F5F7]"
                        }`}
                      >
                        {value}
                      </span>
                      <span
                        className={`text-center text-[9px] font-medium leading-[1.25] ${
                          isSelected ? "text-[#C4B5FD]" : "text-[#48484A]"
                        }`}
                      >
                        {label}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>

            <div className="shrink-0 pt-6">
              <div className="flex flex-col items-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={submitting}
                    className="text-[14px] font-medium text-[#8E8E93] underline decoration-[#48484A] underline-offset-4 transition active:opacity-70 disabled:opacity-40"
                  >
                    上一题
                  </button>
                )}
              </div>

              <AnimatePresence>
                {error ? (
                  <motion.div
                    key={error}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="mt-6 flex flex-col items-center gap-4"
                  >
                    <p className="text-center text-[13px] text-[#FF453A]">{error}</p>
                    {isLast ? (
                      <button
                        type="button"
                        onClick={() => void submitReport()}
                        disabled={submitting}
                        className="rounded-full bg-[#7C5CFC] px-6 py-2.5 text-[14px] font-semibold text-[#F5F5F7] shadow-[0_0_20px_rgba(124,92,252,0.2)] disabled:opacity-50"
                      >
                        重试生成
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[428px] bg-gradient-to-t from-[#0A0A0F] from-40% to-transparent px-6 pb-[calc(env(safe-area-inset-bottom,24px)+16px)] pt-8"
          >
            <p className="text-center text-[14px] font-medium text-[#8E8E93]">正在生成报告…</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
