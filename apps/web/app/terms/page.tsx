import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "用户协议",
  description: "MBTI × 星座灵魂伴侣报告 — 使用条款",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-svh max-w-[428px] px-6 py-12 text-[15px] leading-[1.65] text-[#8E8E93]">
      <Link href="/" className="text-[13px] text-[#7C5CFC]">
        ← 返回首页
      </Link>
      <h1 className="mt-8 text-[24px] font-semibold text-[#F5F5F7]">用户协议</h1>
      <p className="mt-6">
        本服务仅供娱乐与自我探索参考，不构成心理诊断、婚恋承诺或职业建议。请勿将结果作为重大人生决策的唯一依据。
      </p>
      <h2 className="mt-10 text-[18px] font-semibold text-[#F5F5F7]">账户与内容</h2>
      <p className="mt-4">
        你应保证所填信息真实、合法。报告内容受法律保护，未经授权不得用于商业爬虫或再分发。
      </p>
      <h2 className="mt-10 text-[18px] font-semibold text-[#F5F5F7]">付费与退款</h2>
      <p className="mt-4">
        数字内容一经解锁，原则上不支持自助退款；如有争议，请联系客服协商处理。
      </p>
      <h2 className="mt-10 text-[18px] font-semibold text-[#F5F5F7]">协议变更</h2>
      <p className="mt-4">我们可能更新本协议，重大变更将在产品内提示。继续使用即视为接受更新。</p>
    </main>
  );
}
