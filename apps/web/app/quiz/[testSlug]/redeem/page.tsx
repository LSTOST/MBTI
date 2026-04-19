import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

import { loadTestBySlug } from "@/lib/test-loader";
import { RedeemGateForm } from "@/features/quiz/redeem-gate-form";

export const dynamic = "force-dynamic";

type Params = Promise<{ testSlug: string }>;

export default async function QuizRedeemPage({ params }: { params: Params }) {
  const { testSlug } = await params;

  const test = await loadTestBySlug(testSlug);
  if (!test || test.status !== "published") notFound();

  // 如果 accessMode 不是 redeem_required，直接去答题
  if (test.accessMode !== "redeem_required") {
    redirect(`/quiz/${testSlug}`);
  }

  // 已持有有效 cookie，直接跳过验证
  const cookieStore = await cookies();
  const token = cookieStore.get(`quiz_access_${testSlug}`)?.value;
  if (token) {
    redirect(`/quiz/${testSlug}`);
  }

  return <RedeemGateForm testSlug={testSlug} testName={test.name} />;
}
