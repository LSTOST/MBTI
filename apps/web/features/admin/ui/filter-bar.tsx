"use client";

import clsx from "clsx";

export type FilterOption<T extends string = string> = { id: T; label: string };

export type FilterBarProps<T extends string = string> = {
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    ariaLabel?: string;
  };
  filters?: {
    options: FilterOption<T>[];
    value: T;
    onChange: (v: T) => void;
  };
  /** 右侧自定义槽位（日期选择器、排序等） */
  trailing?: React.ReactNode;
};

export function FilterBar<T extends string = string>({ search, filters, trailing }: FilterBarProps<T>) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {search ? (
        <input
          type="search"
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder ?? "搜索…"}
          aria-label={search.ariaLabel ?? "搜索"}
          className="h-11 w-full max-w-md rounded-xl bg-[#111118] px-4 text-[14px] text-[#F5F5F7] outline-none ring-1 ring-[#2A2A36] placeholder:text-[#48484A] focus:ring-[#7C5CFC] sm:w-80"
        />
      ) : (
        <div />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {filters ? (
          <div className="flex flex-wrap gap-2">
            {filters.options.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => filters.onChange(f.id)}
                className={clsx(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  filters.value === f.id
                    ? "bg-[rgba(124,92,252,0.2)] text-[#C4B5FC]"
                    : "bg-[#1A1A24] text-[#8E8E93] hover:text-[#F5F5F7]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}
        {trailing}
      </div>
    </div>
  );
}
