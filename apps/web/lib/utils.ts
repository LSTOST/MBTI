import { clsx } from "clsx";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** 契合指数展示：四舍五入为整数（内部分数仍可带小数用于排序） */
export function formatCompatibilityScore(n: number): string {
  return String(Math.round(Number(n)));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function checksumAnswers(values: Array<{ questionId: string; value: number }>) {
  return values.map((item) => `${item.questionId}:${item.value}`).join("|");
}

