import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "MBTI × 星座灵魂伴侣报告 — 数据收集与使用说明",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-svh max-w-[428px] px-6 py-12 text-[15px] leading-[1.65] text-[#8E8E93]">
      <Link href="/" className="text-[13px] text-[#7C5CFC]">
        ← 返回首页
      </Link>
      <h1 className="mt-8 text-[24px] font-semibold text-[#F5F5F7]">隐私政策</h1>
      <p className="mt-6">
        本页说明我们收集哪些数据、用于何种目的。使用本服务即表示你理解并同意本政策要点。
      </p>
      <h2 className="mt-10 text-[18px] font-semibold text-[#F5F5F7]">我们收集的数据</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>基础资料：昵称、性别、出生日期（用于星座与文案展示）</li>
        <li>测评答题结果（用于计算 MBTI 与生成报告）</li>
        <li>设备匿名标识（Cookie，用于关联你的报告与订单）</li>
        <li>订单与支付渠道信息（不含银行卡号）</li>
      </ul>
      <h2 className="mt-10 text-[18px] font-semibold text-[#F5F5F7]">用途</h2>
      <p className="mt-4">生成与展示报告、完成支付与售后服务、产品与体验优化（含匿名统计）。</p>
      <h2 className="mt-10 text-[18px] font-semibold text-[#F5F5F7]">第三方与 AI</h2>
      <p className="mt-4">
        AI
        解读仅基于结构化报告摘要发起请求，不向模型提供可单独识别你身份的信息。支付由持牌第三方支付机构处理。
      </p>
      <h2 className="mt-10 text-[18px] font-semibold text-[#F5F5F7]">联系我们</h2>
      <p className="mt-4">若需查询、更正或删除数据，请通过产品内客服渠道与我们联系。</p>
    </main>
  );
}
