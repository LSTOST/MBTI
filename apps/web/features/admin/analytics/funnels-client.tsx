"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pin, PinOff, Trash2 } from "lucide-react";

import { readAdminJson } from "@/lib/admin-api-json";
import { useToast } from "@/features/admin/ui/toast";
import { Drawer } from "@/features/admin/ui/drawer";
import { ConfirmDialog } from "@/features/admin/ui/confirm-dialog";

type Funnel = {
  id: string;
  name: string;
  description: string | null;
  steps: unknown;
  windowHours: number;
  pinned: boolean;
  updatedAt: string | Date;
};

type Step = { eventName: string };

type Form = {
  name: string;
  description: string;
  steps: Step[];
  windowHours: string;
  pinned: boolean;
};

const emptyForm: Form = {
  name: "",
  description: "",
  steps: [{ eventName: "" }, { eventName: "" }],
  windowHours: "24",
  pinned: false,
};

function NewButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function close() { setOpen(false); setError(""); setForm(emptyForm); }

  function updateStep(i: number, val: string) {
    setForm((s) => {
      const steps = [...s.steps];
      steps[i] = { eventName: val };
      return { ...s, steps };
    });
  }

  function addStep() {
    if (form.steps.length >= 10) return;
    setForm((s) => ({ ...s, steps: [...s.steps, { eventName: "" }] }));
  }

  function removeStep(i: number) {
    if (form.steps.length <= 2) return;
    setForm((s) => ({ ...s, steps: s.steps.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit() {
    setError("");
    if (!form.name.trim()) { setError("漏斗名称必填"); return; }
    const steps = form.steps.map((s) => ({ eventName: s.eventName.trim() })).filter((s) => s.eventName);
    if (steps.length < 2) { setError("至少需要 2 个有效步骤"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/analytics/funnels", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          steps,
          windowHours: Number(form.windowHours) || 24,
          pinned: form.pinned,
        }),
      });
      const parsed = await readAdminJson<{ ok?: boolean; id?: string; error?: string }>(res);
      if (!res.ok || !parsed.ok) throw new Error(parsed.ok ? (parsed.data.error ?? "创建失败") : parsed.message);
      toast.success("漏斗已创建");
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
        新建漏斗
      </button>

      {open && (
        <Drawer
          title="新建漏斗"
          onClose={close}
          footer={
            <>
              <button type="button" onClick={close} className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#8E8E93] hover:bg-[#1A1A24]">取消</button>
              <button type="button" disabled={submitting} onClick={() => void handleSubmit()} className="rounded-xl bg-[#7C5CFC] px-5 py-2.5 text-[14px] font-semibold text-[#F5F5F7] disabled:opacity-50">
                {submitting ? "创建中…" : "创建"}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="漏斗名称 *">
              <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="用户转化漏斗" className={inputClass} />
            </Field>
            <Field label="说明">
              <input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="从首页到支付成功" className={inputClass} />
            </Field>

            <div>
              <label className="mb-2 block text-[12px] font-medium text-[#8E8E93]">步骤（2–10 步）*</label>
              <div className="flex flex-col gap-2">
                {form.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-center text-[11px] text-[#48484A]">{i + 1}</span>
                    <input
                      value={step.eventName}
                      onChange={(e) => updateStep(i, e.target.value)}
                      placeholder={`事件名，如 started_quiz`}
                      className={`${inputClass} flex-1`}
                    />
                    {form.steps.length > 2 && (
                      <button type="button" onClick={() => removeStep(i)} className="shrink-0 rounded-lg p-1.5 text-[#48484A] hover:text-[#FF453A]">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {form.steps.length < 10 && (
                <button type="button" onClick={addStep} className="mt-2 text-[12px] text-[#7C5CFC] hover:underline">
                  + 添加步骤
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="时间窗（小时）" hint="完成整个漏斗的最长时间。">
                <input type="number" min="1" max="720" value={form.windowHours} onChange={(e) => setForm((s) => ({ ...s, windowHours: e.target.value }))} className={inputClass} />
              </Field>
              <Field label="置顶到 Dashboard">
                <button
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, pinned: !s.pinned }))}
                  className={`mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] ring-1 ${form.pinned ? "bg-[rgba(124,92,252,0.12)] ring-[#7C5CFC] text-[#C4B5FC]" : "ring-[#1A1A24] text-[#8E8E93]"}`}
                >
                  {form.pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                  {form.pinned ? "已置顶" : "不置顶"}
                </button>
              </Field>
            </div>

            {error ? <div className="rounded-xl bg-[rgba(255,69,58,0.08)] px-3.5 py-2.5 text-[12.5px] text-[#FF453A] ring-1 ring-[rgba(255,69,58,0.24)]">{error}</div> : null}
          </div>
        </Drawer>
      )}
    </>
  );
}

function Actions({ funnel }: { funnel: Funnel }) {
  const router = useRouter();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pinning, setPinning] = useState(false);

  async function togglePin() {
    setPinning(true);
    try {
      const res = await fetch(`/api/admin/analytics/funnels/${funnel.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !funnel.pinned }),
      });
      const parsed = await readAdminJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !parsed.ok) throw new Error(parsed.ok ? (parsed.data.error ?? "操作失败") : parsed.message);
      toast.success(funnel.pinned ? "已取消置顶" : "已置顶到 Dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPinning(false);
    }
  }

  async function deleteFunnel() {
    const res = await fetch(`/api/admin/analytics/funnels/${funnel.id}`, { method: "DELETE", credentials: "include" });
    const parsed = await readAdminJson<{ ok?: boolean; error?: string }>(res);
    if (!res.ok || !parsed.ok) throw new Error(parsed.ok ? (parsed.data.error ?? "删除失败") : parsed.message);
    toast.success("漏斗已删除");
    setConfirmDelete(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={pinning}
        onClick={() => void togglePin()}
        className={`rounded-lg p-1.5 disabled:opacity-50 ${funnel.pinned ? "text-[#7C5CFC] hover:bg-[rgba(124,92,252,0.12)]" : "text-[#48484A] hover:bg-[#1A1A24] hover:text-[#F5F5F7]"}`}
        title={funnel.pinned ? "取消置顶" : "置顶"}
      >
        {funnel.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
      </button>
      <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-lg p-1.5 text-[#48484A] hover:bg-[rgba(255,69,58,0.08)] hover:text-[#FF453A]" title="删除">
        <Trash2 className="h-4 w-4" />
      </button>
      {confirmDelete && (
        <ConfirmDialog
          title={`删除漏斗「${funnel.name}」`}
          description="此操作不可撤销。"
          confirmLabel="删除"
          danger
          onConfirm={deleteFunnel}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
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

export { NewButton as FunnelsNewButton, Actions as FunnelsActions };
