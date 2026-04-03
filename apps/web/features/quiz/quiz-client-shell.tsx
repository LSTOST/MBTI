"use client";

import { useEffect, useState } from "react";

import { QuizRunner } from "@/features/quiz/quiz-runner";
import { MBTI_INTAKE_KEY as intakeKey } from "@/lib/mbti-storage";
import type { UserProfileInput } from "@/lib/types";

export function QuizClientShell() {
  const [profile, setProfile] = useState<UserProfileInput | null>(null);
  const [intakeReady, setIntakeReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const cached = window.localStorage.getItem(intakeKey);
      if (cached) {
        try {
          setProfile(JSON.parse(cached) as UserProfileInput);
        } catch {
          /* ignore */
        }
      }
      setIntakeReady(true);
    });
  }, []);

  if (!intakeReady) {
    return (
      <main
        className="relative mx-auto flex min-h-svh w-full max-w-[428px] flex-col items-center justify-center bg-[#0A0A0F] px-6"
        aria-busy="true"
      >
        <p className="text-[14px] text-[#8E8E93]">加载中…</p>
      </main>
    );
  }

  return <QuizRunner profile={profile} />;
}
