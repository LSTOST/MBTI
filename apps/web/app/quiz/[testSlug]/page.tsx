import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

import { QuizClientShell } from "@/features/quiz/quiz-client-shell";
import { loadTestBySlug } from "@/lib/test-loader";

export const dynamic = "force-dynamic";

type Params = Promise<{ testSlug: string }>;

/**
 * 按 slug 动态渲染测试答题界面。
 *
 * 现状：只有 reportStrategy = "mbti_compatibility"（36 题 MBTI）接入了完整答题器。
 * 其它策略会显示「即将开放」占位页，避免把草稿直接暴露给用户。
 *
 * 已归档 / 草稿状态对用户不可见，一律走 404。
 */
export default async function QuizBySlugPage({ params }: { params: Params }) {
  const { testSlug } = await params;

  const test = await loadTestBySlug(testSlug);
  if (!test) notFound();

  // 后台可见但未发布的模板不开放答题
  if (test.status !== "published") {
    return <UnpublishedNotice slug={testSlug} />;
  }

  // 兑换码准入：未持有有效 cookie 则跳转验证页
  if (test.accessMode === "redeem_required") {
    const cookieStore = await cookies();
    const token = cookieStore.get(`quiz_access_${testSlug}`)?.value;
    if (!token) {
      redirect(`/quiz/${testSlug}/redeem`);
    }
  }

  // 目前仅 mbti_compatibility 策略有成熟答题器；其余占位
  if (test.reportStrategy === "mbti_compatibility") {
    return <QuizClientShell />;
  }

  return <StrategyUnsupportedNotice name={test.name} strategy={test.reportStrategy} />;
}

function UnpublishedNotice({ slug }: { slug: string }) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[428px] flex-col items-center justify-center gap-4 bg-[#0A0A0F] px-6 text-center">
      <h1 className="text-[20px] font-semibold text-[#F5F5F7]">这个测试尚未发布</h1>
      <p className="text-[14px] leading-relaxed text-[#8E8E93]">
        <code className="font-mono text-[12px] text-[#48484A]">{slug}</code>{" "}
        还处于草稿或归档状态，运营发布后方可开始答题。
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-10 items-center justify-center rounded-full bg-[#1A1A24] px-5 text-[13px] text-[#F5F5F7] hover:bg-[#24242F]"
      >
        返回首页
      </Link>
    </main>
  );
}

function StrategyUnsupportedNotice({ name, strategy }: { name: string; strategy: string }) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[428px] flex-col items-center justify-center gap-4 bg-[#0A0A0F] px-6 text-center">
      <h1 className="text-[20px] font-semibold text-[#F5F5F7]">{name} 即将开放</h1>
      <p className="text-[14px] leading-relaxed text-[#8E8E93]">
        该测试的报告策略 <code className="font-mono text-[12px] text-[#48484A]">{strategy}</code>{" "}
        尚未在前端接入答题器。内容已入库，上线前会补齐渲染层。
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-10 items-center justify-center rounded-full bg-[#1A1A24] px-5 text-[13px] text-[#F5F5F7] hover:bg-[#24242F]"
      >
        返回首页
      </Link>
    </main>
  );
}
