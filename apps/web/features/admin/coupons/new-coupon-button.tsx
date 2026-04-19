"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { readAdminJson } from "@/lib/admin-api-json";
import { useToast } from "@/features/admin/ui/toast";
import { Drawer } from "@/features/admin/ui/drawer";

type Form = {
  code: string;
  type: "percent_off" | "amount_off";
  value: string;
  scope: "global" | "test";
  minAmount: string;
  maxRedemptions: string;
  perUserLimit: string;
  expiresAt: string;
  note: string;
};

const empty: Form = {
  code: "",
  type: "percent_off",
  value: "",
  scope: "global",
  minAmount: "0",
  maxRedemptions: "",
  perUserLimit: "1",
  expiresAt: "",
  note: "",
};

export function NewCouponButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function handleSubmit() {
    setError("");
    if (!form.code.trim()) { setError("优惠码必填"); return; }
    const val = Number(form.value);
    if (!form.value || isNaN(val) || val <= 0) { setError("折扣值必须大于 0"); return; }
    if (form.type === "percent_off" && (val < 1 || val > 100)) {
      setError("百分比折扣值需在 1–100 之间");
      return;
    }

    const body: Record<string, unknown> = {
      code: form.code.trim(),
      type: form.type,
      value: form.type === "amount_off" ? Math.round(val * 100) : Math.round(val),
      scope: form.scope,
      minAmount: Math.round(Number(form.minAmount || 0) * 100),
      perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : null,
    };
    if (form.maxRedemptions) body.maxRedemptions = Number(form.maxRedemptions);
    if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();
    if (form.note.trim()) body.note = form.note.trim();

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const parsed = await readAdminJson<{ ok?: boolean; id?: string; error?: string }>(res);
      if (!res.ok || !parsed.ok) {
        throw new Error(parsed.ok ? parsed.data.error ?? "创建失败" : parsed.message);
      }
      toast.success("优惠码已创建");
      setOpen(false);
      setForm(empty);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#7C5CFC] px-4 py-2 text-[13px] font-semibold text-[#F5F5F7] hover:bg-[#8a6dff]"
      >
        <Plus className="h-4 w-4" />
        新建优惠码
      </button>

      {open && (
        <Drawer
          title="新建优惠码"
          onClose={() => { setOpen(false); setError(""); setForm(empty); }}
          footer={
            <>
              <button
                type="button"
                onClick={() => { setOpen(false); setError(""); setForm(empty); }}
                className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#8E8E93] hover:bg-[#1A1A24]"
              >
                取消
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="rounded-xl bg-[#7C5CFC] px-5 py-2.5 text-[14px] font-semibold text-[#F5F5F7] disabled:opacity-50"
              >
                {submitting ? "创建中…" : "创建"}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="优惠码 *" hint="自动转大写存储。">
              <input
                value={form.code}
                onChange={(e) => update("code", e.target.value.toUpperCase())}
                placeholder="SUMMER20"
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="折扣类型 *">
                <select
                  value={form.type}
                  onChange={(e) => update("type", e.target.value as Form["type"])}
                  className={inputClass}
                >
                  <option value="percent_off">百分比折扣（%）</option>
                  <option value="amount_off">固定减额（元）</option>
                </select>
              </Field>
              <Field
                label={form.type === "percent_off" ? "折扣 %" : "减额（元）"}
                hint={form.type === "percent_off" ? "1–100" : "如 10 = 减 10 元"}
              >
                <input
                  type="number"
                  min="1"
                  step={form.type === "percent_off" ? "1" : "0.01"}
                  value={form.value}
                  onChange={(e) => update("value", e.target.value)}
                  placeholder={form.type === "percent_off" ? "20" : "10"}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="范围">
              <select
                value={form.scope}
                onChange={(e) => update("scope", e.target.value as Form["scope"])}
                className={inputClass}
              >
                <option value="global">全站通用</option>
                <option value="test">仅指定测试（TODO：需填 testId）</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="最低订单（元）" hint="低于此金额不可用。0=不限。">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minAmount}
                  onChange={(e) => update("minAmount", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="总使用上限" hint="留空=不限。">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.maxRedemptions}
                  onChange={(e) => update("maxRedemptions", e.target.value)}
                  placeholder="100"
                  className={inputClass}
                />
              </Field>
              <Field label="单人上限" hint="同一用户最多用几次。">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.perUserLimit}
                  onChange={(e) => update("perUserLimit", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="到期时间" hint="留空=永久有效。">
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => update("expiresAt", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="备注">
              <input
                value={form.note}
                onChange={(e) => update("note", e.target.value)}
                placeholder="2026 夏季活动"
                className={inputClass}
              />
            </Field>

            {error ? (
              <div className="rounded-xl bg-[rgba(255,69,58,0.08)] px-3.5 py-2.5 text-[12.5px] text-[#FF453A] ring-1 ring-[rgba(255,69,58,0.24)]">
                {error}
              </div>
            ) : null}
          </div>
        </Drawer>
      )}
    </>
  );
}

const inputClass =
  "w-full rounded-xl bg-[#0A0A0F] px-3 py-2 text-[13.5px] text-[#F5F5F7] ring-1 ring-[#1A1A24] placeholder:text-[#48484A] focus:outline-none focus:ring-[#7C5CFC]";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-[#8E8E93]">{label}</label>
      {children}
      {hint ? <p className="text-[11px] leading-snug text-[#48484A]">{hint}</p> : null}
    </div>
  );
}
