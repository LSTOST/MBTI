import Link from "next/link";

export type TestTabId = "overview" | "questions" | "scoring" | "pricing" | "preview";

type Tab = {
  id: TestTabId;
  label: string;
  href: string;
  enabled: boolean;
};

/** 测试详情页 tabs。已启用的 tab 用 Link；未启用的灰色占位。 */
export function TestTabsBar({ testId, active }: { testId: string; active: TestTabId }) {
  const tabs: Tab[] = [
    { id: "overview", label: "概览", href: `/admin/tests/${testId}`, enabled: true },
    { id: "questions", label: "题目", href: `/admin/tests/${testId}/questions`, enabled: true },
    { id: "scoring", label: "计分", href: `/admin/tests/${testId}/scoring`, enabled: true },
    { id: "pricing", label: "定价", href: `/admin/tests/${testId}/pricing`, enabled: true },
    { id: "preview", label: "预览", href: `/admin/tests/${testId}/preview`, enabled: true },
  ];

  return (
    <nav aria-label="测试详情分区" className="flex items-center gap-1 border-b border-[#1A1A24]">
      {tabs.map((t) => {
        const isActive = t.id === active;
        const base =
          "inline-flex items-center gap-1 rounded-t-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors";
        if (!t.enabled) {
          return (
            <span
              key={t.id}
              className={`${base} cursor-not-allowed text-[#48484A]`}
              title="即将开放"
            >
              {t.label}
              <span className="rounded-full bg-[#1A1A24] px-1.5 py-0.5 text-[9.5px] text-[#48484A]">
                即将
              </span>
            </span>
          );
        }
        return (
          <Link
            key={t.id}
            href={t.href}
            className={
              isActive
                ? `${base} border-b-2 border-[#7C5CFC] -mb-px text-[#F5F5F7]`
                : `${base} text-[#8E8E93] hover:text-[#F5F5F7]`
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
