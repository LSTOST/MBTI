import { redirect } from "next/navigation";

/**
 * /quiz 是旧入口，统一重定向到默认 MBTI 测试。
 * 站内链接应逐步改为 /quiz/<slug>；这里兜底避免外链失效。
 */
export default function QuizRedirectPage() {
  redirect("/quiz/mbti-love");
}
