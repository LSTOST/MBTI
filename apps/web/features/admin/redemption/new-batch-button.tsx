"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { readAdminJson } from "@/lib/admin-api-json";
import { useToast } from "@/features/admin/ui/toast";
import { Drawer } from "@/features/admin/ui/drawer";

type Form = {
  name: string;
  note: string;
  count: string;
  maxRedemptions: string;
  expiresAt: string;
  prefix: string;
  tailLength: string;
};

const empty: Form = {
  name: "",
  note: "",
  count: "100",
  maxRedemptions: "1",
  expiresAt: "",
  prefix: "",
  tailLength: "8",
};

export function NewBatchButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function close() {
    setOpen(false);
    setError("");
    setForm(empty);
  }

  async function handleSubmit() {
    setError("");
    if (!form.name.trim()) { setError("批次名称必填"); return; }
    const count = Number(form.count);
    if (!count || count < 1 || count > 5000) { setError("数量需在 1–5000 之间"); return; }

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      count,
      maxRedemptions: Number(form.maxRedemptions) || 1,
      tailLength: Number(form.tailLength) || 8,
    };
    if (form.note.trim()) body.note = form.note.trim();
    if (form.prefix.trim()) body.prefix = form.prefix.trim().toUpperCase();
    if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/redemption/batches", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const parsed = await readAdminJson<{ ok?: boolean; id?: string; count?: number; error?: string }>(res);
      if (!res.ok || !parsed.ok) {
        throw new Error(parsed.ok ? (parsed.data.error ?? "创建失败") : parsed.message);
      }
      toast.success(`批次已创建，共生成 ${parsed.data.count ?? count} 张码`);
      close();
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
        新建批次
      </button>

      {open && (
        <Drawer
          title="新建兑换码批次"
          onClose={close}
          footer={
            <>
              <button
                type="button"
                onClick={close}
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
                {submitting ? "生成中…" : "生成"}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="批次名称 *" hint="如「2026 春节活动」，用于归档与搜索。">
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="2026 春节活动"
                className={inputClass}
              />
            </Field>

            <Field label="备注" hint="仅后台可见。">
              <input
                value={form.note}
                onChange={(e) => update("note", e.target.value)}
                placeholder="发给 VIP 用户"
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="生成数量 *" hint="最多 5000 张。">
                <input
                  type="number"
                  min="1"
                  max="5000"
                  step="1"
                  value={form.count}
                  onChange={(e) => update("count", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="单码核销上限" hint="每张码可被使用几次。">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.maxRedemptions}
                  onChange={(e) => update("maxRedemptions", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="到期时间" hint="留空=永久有效。">
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => update("expiresAt", e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="rounded-xl bg-[#0A0A0F] p-4 ring-1 ring-[#1A1A24]">
              <p className="mb-3 text-[12px] font-medium text-[#8E8E93]">码格式</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="自定义前缀" hint="仅字母/数字，可留空。">
                  <input
                    value={form.prefix}
                    onChange={(e) => update("prefix", e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
                    placeholder="SPRING"
                    maxLength={12}
                    className={inputClass}
                  />
                </Field>
                <Field label="随机尾长度" hint="4–16 位随机字符。">
                  <select
                    value={form.tailLength}
                    onChange={(e) => update("tailLength", e.target.value)}
                    className={inputClass}
                  >
                    <option value="4">4 位</option>
                    <option value="6">6 位</option>
                    <option value="8">8 位（推荐）</option>
                    <option value="10">10 位</option>
                    <option value="12">12 位</option>
                  </select>
                </Field>
              </div>
              <p className="mt-2.5 font-mono text-[11px] text-[#48484A]">
                示例：{form.prefix ? `${form.prefix.toUpperCase()}-` : ""}
                {"X".repeat(Number(form.tailLength) || 8)}
              </p>
            </div>

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
