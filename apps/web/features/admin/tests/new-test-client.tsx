"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { readAdminJson } from "@/lib/admin-api-json";

type Strategy = { id: string; displayName: string; description: string };

type Form = {
  name: string;
  slug: string;
  tagline: string;
  reportStrategy: string;
  pricingMode: "free" | "paid_unlock" | "paid_entry";
  basePrice: string;
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function NewTestClient({ strategies }: { strategies: Strategy[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>({
    name: "",
    slug: "",
    tagline: "",
    reportStrategy: strategies[0]?.id ?? "",
    pricingMode: "free",
    basePrice: "0",
  });
  const [slugManual, setSlugManual] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((s) => {
      const next = { ...s, [k]: v };
      // 自动生成 slug，除非用户已手动编辑
      if (k === "name" && !slugManual) {
        next.slug = slugify(v as string);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) { setError("测试名称必填"); return; }
    if (!form.slug) { setError("slug 必填"); return; }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setError("slug 仅允许小写字母、数字、短横线");
      return;
    }
    if (!form.reportStrategy) { setError("请选择报告策略"); return; }

    const basePrice =
      form.pricingMode === "free" ? 0 : Math.round(Number(form.basePrice) * 100);
    if (form.pricingMode !== "free" && (!Number.isFinite(basePrice) || basePrice <= 0)) {
      setError("付费模式下价格必须大于 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug,
          tagline: form.tagline.trim() || undefined,
          reportStrategy: form.reportStrategy,
          pricingMode: form.pricingMode,
          basePrice,
          accessMode: "public",
        }),
      });
      const parsed = await readAdminJson<{ ok?: boolean; id?: string; slug?: string; error?: string }>(res);
      if (!res.ok || !parsed.ok) {
        throw new Error(parsed.ok ? parsed.data.error ?? "创建失败" : parsed.message);
      }
      const id = parsed.data.id;
      if (!id) throw new Error("服务端未返回 id");
      router.push(`/admin/tests/${id}?created=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedStrategy = strategies.find((s) => s.id === form.reportStrategy);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
      {/* 基本信息 */}
      <section className="flex flex-col gap-4 rounded-2xl bg-[#111118] p-5 ring-1 ring-[#1A1A24]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#48484A]">
          基本信息
        </p>

        <Field label="测试名称 *">
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="MBTI 职场风格"
            className={inputClass}
            autoFocus
          />
        </Field>

        <Field label="slug *" hint="URL 片段，仅小写字母/数字/短横线。将出现在 /quiz/<slug>。">
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugManual(true);
              update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            placeholder="mbti-workplace"
            className={inputClass}
          />
        </Field>

        <Field label="副标题" hint="首页和测试入口处显示，可留空后补。">
          <input
            value={form.tagline}
            onChange={(e) => update("tagline", e.target.value)}
            placeholder="用 24 题找出你的职场人格"
            className={inputClass}
          />
        </Field>
      </section>

      {/* 报告策略 */}
      <section className="flex flex-col gap-4 rounded-2xl bg-[#111118] p-5 ring-1 ring-[#1A1A24]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#48484A]">
          报告策略
        </p>
        <div className="flex flex-col gap-2">
          {strategies.map((s) => (
            <label
              key={s.id}
              className={`flex cursor-pointer gap-3 rounded-xl px-4 py-3 ring-1 transition ${
                form.reportStrategy === s.id
                  ? "bg-[rgba(124,92,252,0.08)] ring-[#7C5CFC]"
                  : "ring-[#1A1A24] hover:ring-[#2A2A34]"
              }`}
            >
              <input
                type="radio"
                name="reportStrategy"
                value={s.id}
                checked={form.reportStrategy === s.id}
                onChange={() => update("reportStrategy", s.id)}
                className="mt-0.5 shrink-0 accent-[#7C5CFC]"
              />
              <div>
                <p className="text-[13.5px] font-medium text-[#F5F5F7]">{s.displayName}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-[#8E8E93]">{s.description}</p>
              </div>
            </label>
          ))}
        </div>
        {selectedStrategy ? (
          <p className="text-[11.5px] text-[#48484A]">
            选好策略后，在「计分」tab 填写对应的 scoringConfig；发布前会自动校验。
          </p>
        ) : null}
      </section>

      {/* 定价 */}
      <section className="flex flex-col gap-4 rounded-2xl bg-[#111118] p-5 ring-1 ring-[#1A1A24]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#48484A]">
          定价模式
        </p>
        <div className="flex flex-col gap-2">
          {(
            [
              { v: "free", label: "免费", hint: "报告全部免费" },
              { v: "paid_unlock", label: "免费答题·付费解锁", hint: "测试免费，高级报告需付费" },
              { v: "paid_entry", label: "入场付费", hint: "进入答题前先付费" },
            ] as const
          ).map(({ v, label, hint }) => (
            <label
              key={v}
              className={`flex cursor-pointer gap-3 rounded-xl px-4 py-3 ring-1 transition ${
                form.pricingMode === v
                  ? "bg-[rgba(124,92,252,0.08)] ring-[#7C5CFC]"
                  : "ring-[#1A1A24] hover:ring-[#2A2A34]"
              }`}
            >
              <input
                type="radio"
                name="pricingMode"
                value={v}
                checked={form.pricingMode === v}
                onChange={() => update("pricingMode", v)}
                className="mt-0.5 shrink-0 accent-[#7C5CFC]"
              />
              <div>
                <p className="text-[13.5px] font-medium text-[#F5F5F7]">{label}</p>
                <p className="mt-0.5 text-[12px] text-[#8E8E93]">{hint}</p>
              </div>
            </label>
          ))}
        </div>

        {form.pricingMode !== "free" && (
          <Field label="基础价格（元）" hint="发布时将转换为分存储。">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.basePrice}
              onChange={(e) => update("basePrice", e.target.value)}
              placeholder="9.90"
              className={inputClass}
            />
          </Field>
        )}
      </section>

      {error ? (
        <div className="rounded-xl bg-[rgba(255,69,58,0.08)] px-4 py-3 text-[13px] text-[#FF453A] ring-1 ring-[rgba(255,69,58,0.24)]">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/tests")}
          className="rounded-xl px-5 py-2.5 text-[14px] font-medium text-[#8E8E93] hover:bg-[#1A1A24]"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-[#7C5CFC] px-6 py-2.5 text-[14px] font-semibold text-[#F5F5F7] shadow-[0_0_16px_rgba(124,92,252,0.2)] hover:bg-[#8a6dff] disabled:opacity-50"
        >
          {submitting ? "创建中…" : "创建草稿"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl bg-[#0A0A0F] px-3.5 py-2.5 text-[13.5px] text-[#F5F5F7] ring-1 ring-[#1A1A24] placeholder:text-[#48484A] focus:outline-none focus:ring-[#7C5CFC]";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-[#8E8E93]">{label}</label>
      {children}
      {hint ? <p className="text-[11px] leading-snug text-[#48484A]">{hint}</p> : null}
    </div>
  );
}
