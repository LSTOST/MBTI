import type { ReactNode } from "react";

export type Crumb = { label: string; href?: string };

export type PageHeaderProps = {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  /** 标题右侧主 CTA（如「新建测试」），接受按钮等任意节点 */
  primaryAction?: ReactNode;
  /** 描述下面再追加的一行元信息，例如「共 128 条 · 最近更新 2026-03-01」 */
  meta?: ReactNode;
};

export function PageHeader({ title, description, crumbs, primaryAction, meta }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 ? (
          <nav className="text-[12px] text-[#48484A]" aria-label="面包屑">
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`}>
                {i > 0 ? <span className="mx-1.5 text-[#2A2A36]" aria-hidden>/</span> : null}
                {c.href ? (
                  <a
                    href={c.href}
                    className={
                      i === crumbs.length - 1
                        ? "text-[#F5F5F7]"
                        : "text-[#8E8E93] hover:text-[#F5F5F7]"
                    }
                  >
                    {c.label}
                  </a>
                ) : (
                  <span className={i === crumbs.length - 1 ? "text-[#F5F5F7]" : "text-[#8E8E93]"}>
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-[#F5F5F7]">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-[640px] text-[13px] leading-relaxed text-[#8E8E93]">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-2 text-[12px] text-[#48484A]">{meta}</div> : null}
      </div>
      {primaryAction ? <div className="shrink-0">{primaryAction}</div> : null}
    </div>
  );
}
