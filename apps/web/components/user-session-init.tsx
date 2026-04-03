"use client";

import { useEffect } from "react";

import { initPostHog } from "@/lib/analytics";

/** PRD 9.10：首访写入 HttpOnly mbti_uid；可选 PostHog */
export function UserSessionInit() {
  useEffect(() => {
    void fetch("/api/user/init", { method: "POST", credentials: "include" });
    initPostHog();
  }, []);
  return null;
}
