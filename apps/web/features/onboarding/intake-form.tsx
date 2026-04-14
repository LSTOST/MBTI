"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { getSunSign } from "@/features/zodiac/signs";
import { trackEvent, analyticsEvents } from "@/lib/analytics";
import { MBTI_INTAKE_KEY as storageKey, MBTI_PROGRESS_KEY } from "@/lib/mbti-storage";
import type { Gender, UserProfileInput } from "@/lib/types";

/** 新用户默认生日；旧版 placeholder「1998-08-17」仅为示例文案，并非代码里的默认值 */
const DEFAULT_BIRTH_DATE = "2001-01-01";

const genderOptions: { value: Gender; label: string }[] = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
];

function loadInitialForm(): UserProfileInput {
  if (typeof window === "undefined") {
    return {
      nickname: "",
      gender: "male",
      birthDate: DEFAULT_BIRTH_DATE,
    };
  }
  const cached = window.localStorage.getItem(storageKey);
  if (!cached) {
    return {
      nickname: "",
      gender: "male",
      birthDate: DEFAULT_BIRTH_DATE,
    };
  }
  try {
    const parsed = JSON.parse(cached) as Partial<UserProfileInput>;
    const rawDate = typeof parsed.birthDate === "string" ? parsed.birthDate : "";
    const n = normalizeBirthDateInput(rawDate.trim());
    const birthDate = getValidBirthDate(n) ? n : DEFAULT_BIRTH_DATE;
    const gender: Gender = parsed.gender === "female" ? "female" : "male";
    return {
      nickname: typeof parsed.nickname === "string" ? parsed.nickname : "",
      gender,
      birthDate,
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return {
      nickname: "",
      gender: "male",
      birthDate: DEFAULT_BIRTH_DATE,
    };
  }
}

function splitToSegs(birthDate: string): { y: string; m: string; d: string } {
  const n = normalizeBirthDateInput(birthDate.trim());
  if (/^(\d{4})-(\d{2})-(\d{2})$/.test(n) && getValidBirthDate(n)) {
    const [y, mo, d] = n.split("-");
    return { y, m: mo, d };
  }
  const [y, mo, d] = DEFAULT_BIRTH_DATE.split("-");
  return { y, m: mo, d };
}

function buildValidFromSegments(y: string, m: string, d: string): string | null {
  const yv = y.replace(/\D/g, "").slice(0, 4);
  const mv = m.replace(/\D/g, "").slice(0, 2);
  const dv = d.replace(/\D/g, "").slice(0, 2);
  if (yv.length !== 4 || mv.length < 1 || dv.length < 1) return null;
  const mm = mv.padStart(2, "0").slice(-2);
  const dd = dv.padStart(2, "0").slice(-2);
  const cand = `${yv}-${mm}-${dd}`;
  return getValidBirthDate(cand) ? cand : null;
}

export function IntakeForm() {
  const router = useRouter();
  const initialForm = useMemo(() => loadInitialForm(), []);
  const [form, setForm] = useState<UserProfileInput>(initialForm);
  const [segs, setSegs] = useState(() => splitToSegs(initialForm.birthDate));
  const [error, setError] = useState("");

  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cand = buildValidFromSegments(segs.y, segs.m, segs.d);
    const birthDate = cand ?? "";
    queueMicrotask(() => {
      setForm((prev) => {
        if (prev.birthDate === birthDate) return prev;
        const next = { ...prev, birthDate };
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    });
  }, [segs]);

  const effectiveBirth = buildValidFromSegments(segs.y, segs.m, segs.d);
  const sunSign =
    effectiveBirth && getValidBirthDate(effectiveBirth) ? getSunSign(effectiveBirth) : null;

  const isComplete = Boolean(form.nickname.trim() && effectiveBirth);

  function updateField<K extends keyof UserProfileInput>(key: K, value: UserProfileInput[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cand = buildValidFromSegments(segs.y, segs.m, segs.d);
    if (!form.nickname.trim() || !cand) {
      setError("请填写昵称和有效出生日期。");
      return;
    }
    setError("");
    updateField("birthDate", cand);
    window.localStorage.removeItem(MBTI_PROGRESS_KEY);
    trackEvent(analyticsEvents.startedQuiz, { stage: "intake_submitted" });
    router.push("/quiz");
  }

  return (
    <main className="relative mx-auto min-h-svh w-full max-w-[428px] overflow-hidden bg-[#0A0A0F]">
      <form onSubmit={handleSubmit} className="flex min-h-svh flex-col">
        <header className="sticky top-0 z-10 flex h-11 items-center bg-[#0A0A0F] px-4">
          <Link
            href="/"
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
        </header>

        <div className="flex-1 px-6 pb-40 pt-8">
          <section className="mb-12">
            <label
              htmlFor="intake-nickname"
              className="mb-4 block text-[15px] font-medium text-[#F5F5F7]"
            >
              你的昵称
            </label>
            <input
              id="intake-nickname"
              type="text"
              value={form.nickname}
              maxLength={12}
              onChange={(e) => updateField("nickname", e.target.value)}
              placeholder="输入昵称"
              className="w-full border-none bg-transparent text-[24px] font-semibold text-[#F5F5F7] caret-[#7C5CFC] outline-none placeholder:text-[#48484A]"
            />
            <div className="mt-3 h-px bg-[rgba(255,255,255,0.06)]" />
          </section>

          <section className="mb-12">
            <span className="mb-4 block text-[15px] font-medium text-[#F5F5F7]">你的生日</span>
            <p className="mb-4 text-[12px] leading-relaxed text-[#8E8E93]">
              固定为 YYYY-MM-DD，填完年份会自动跳到月份，再跳到日期。
            </p>
            <div className="flex items-end justify-center gap-2 sm:gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  ref={yearRef}
                  id="intake-birth-year"
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday-year"
                  aria-label="出生年份，四位数"
                  placeholder="YYYY"
                  value={segs.y}
                  maxLength={4}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setSegs((s) => ({ ...s, y: v }));
                    if (v.length === 4) {
                      monthRef.current?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" && segs.y.length === 4) {
                      monthRef.current?.focus();
                    }
                  }}
                  className="w-full border-none bg-transparent text-center text-[22px] font-semibold tabular-nums text-[#F5F5F7] caret-[#7C5CFC] outline-none placeholder:text-[#48484A] sm:text-[24px]"
                />
                <span className="text-center text-[11px] text-[#48484A]">年</span>
              </div>
              <span className="mb-7 text-[20px] font-light text-[#48484A]" aria-hidden>
                -
              </span>
              <div className="flex w-[4.25rem] shrink-0 flex-col gap-2 sm:w-[4.5rem]">
                <input
                  ref={monthRef}
                  id="intake-birth-month"
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday-month"
                  aria-label="出生月份，两位数"
                  placeholder="MM"
                  value={segs.m}
                  maxLength={2}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setSegs((s) => ({ ...s, m: v }));
                    if (v.length === 2) {
                      dayRef.current?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && segs.m === "") {
                      yearRef.current?.focus();
                    }
                    if (e.key === "ArrowLeft" && segs.m === "") {
                      yearRef.current?.focus();
                    }
                    if (e.key === "ArrowRight" && segs.m.length === 2) {
                      dayRef.current?.focus();
                    }
                  }}
                  onBlur={() => {
                    setSegs((s) => {
                      if (s.m.length !== 1) return s;
                      return { ...s, m: s.m.padStart(2, "0") };
                    });
                  }}
                  className="w-full border-none bg-transparent text-center text-[22px] font-semibold tabular-nums text-[#F5F5F7] caret-[#7C5CFC] outline-none placeholder:text-[#48484A] sm:text-[24px]"
                />
                <span className="text-center text-[11px] text-[#48484A]">月</span>
              </div>
              <span className="mb-7 text-[20px] font-light text-[#48484A]" aria-hidden>
                -
              </span>
              <div className="flex w-[4.25rem] shrink-0 flex-col gap-2 sm:w-[4.5rem]">
                <input
                  ref={dayRef}
                  id="intake-birth-day"
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday-day"
                  aria-label="出生日，两位数"
                  placeholder="DD"
                  value={segs.d}
                  maxLength={2}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setSegs((s) => ({ ...s, d: v }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && segs.d === "") {
                      monthRef.current?.focus();
                    }
                    if (e.key === "ArrowLeft" && segs.d === "") {
                      monthRef.current?.focus();
                    }
                  }}
                  onBlur={() => {
                    setSegs((s) => {
                      if (s.d.length !== 1) return s;
                      return { ...s, d: s.d.padStart(2, "0") };
                    });
                  }}
                  className="w-full border-none bg-transparent text-center text-[22px] font-semibold tabular-nums text-[#F5F5F7] caret-[#7C5CFC] outline-none placeholder:text-[#48484A] sm:text-[24px]"
                />
                <span className="text-center text-[11px] text-[#48484A]">日</span>
              </div>
            </div>
            <div className="mt-3 h-px bg-[rgba(255,255,255,0.06)]" />
            <p className="mt-3 text-[12px] text-[#8E8E93]">
              {sunSign ? `已识别太阳星座：${sunSign}` : "用于计算太阳星座，不做完整星盘。"}
            </p>
          </section>

          <section className="mb-12">
            <span className="mb-4 block text-[15px] font-medium text-[#F5F5F7]">你的性别</span>
            <div className="flex flex-wrap gap-2">
              {genderOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateField("gender", value)}
                  className={`rounded-full px-4 py-2 text-[14px] font-medium transition-all duration-200 ${
                    form.gender === value
                      ? "bg-[rgba(124,92,252,0.12)] text-[#7C5CFC]"
                      : "bg-[#111118] text-[#8E8E93] active:bg-[#1A1A24]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-[#48484A]">仅影响文案口吻，不参与匹配算法。</p>
          </section>

          <section>
            <span className="mb-4 block text-[15px] font-medium text-[#F5F5F7]">
              关于 MBTI
            </span>
            <p className="text-[13px] leading-[1.5] text-[#8E8E93]">
              MBTI 类型由下一步测评题目生成，无需在此填写。
            </p>
          </section>

          {error ? <p className="mt-8 text-[13px] text-[#FF453A]">{error}</p> : null}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-10 mx-auto max-w-[428px] bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F] to-transparent px-6 pb-[calc(env(safe-area-inset-bottom,12px)+12px)] pt-4">
          <button
            type="submit"
            disabled={!isComplete}
            className={`h-[56px] w-full rounded-[24px] text-[17px] font-semibold transition-all duration-300 ${
              isComplete
                ? "bg-[#7C5CFC] text-[#F5F5F7] shadow-[0_0_24px_rgba(124,92,252,0.25)] active:scale-[0.98]"
                : "bg-[#1A1A24] text-[#48484A]"
            }`}
          >
            继续
          </button>
        </div>
      </form>
    </main>
  );
}

function normalizeBirthDateInput(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/[年/.]/g, "-")
    .replace(/月/g, "-")
    .replace(/日/g, "")
    .replace(/\s+/g, "")
    .replace(/-+/g, "-");

  const parts = cleaned.split("-").filter(Boolean);
  if (parts.length !== 3) {
    return cleaned;
  }

  const [year, month, day] = parts;
  if (!year || !month || !day) {
    return cleaned;
  }

  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
}
