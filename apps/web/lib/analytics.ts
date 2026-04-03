import posthog from "posthog-js";

export const analyticsEvents = {
  startedQuiz: "started_quiz",
  submittedQuiz: "submitted_quiz",
  viewedFreeReport: "viewed_free_report",
  clickedPay: "clicked_pay",
  paidReport: "paid_report",
  clickedAi: "clicked_ai",
  aiCompleted: "ai_completed",
  aiFailed: "ai_failed",
  clickedShare: "clicked_share",
  shareSuccess: "share_success",
} as const;

let posthogReady = false;

export function initPostHog() {
  if (typeof window === "undefined" || posthogReady) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    persistence: "localStorage+cookie",
  });
  posthogReady = true;
}

export function trackEvent(name: string, payload?: Record<string, unknown>) {
  if (typeof window !== "undefined" && posthogReady) {
    posthog.capture(name, payload);
  }
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    console.info("[analytics]", name, payload || {});
  }
}
