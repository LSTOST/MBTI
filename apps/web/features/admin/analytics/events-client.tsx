"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { readAdminJson } from "@/lib/admin-api-json";
import { useToast } from "@/features/admin/ui/toast";
import { Drawer } from "@/features/admin/ui/drawer";
import { ConfirmDialog } from "@/features/admin/ui/confirm-dialog";

type Event = {
  id: string;
  name: string;
  displayName: string;
  category: string;
  description: string | null;
  properties: unknown;
  status: "active" | "deprecated";
};

type Form = {
  name: string;
  displayName: string;
  category: string;
  description: string;
};

const emptyForm: Form = { name: "", displayName: "", category: "", description: "" };

function NewButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function close() { setOpen(false); setError(""); setForm(emptyForm); }

  async function handleSubmit() {
    setError("");
    if (!form.name.trim()) { setError("事件名必填"); return; }
    if (!form.displayName.trim()) { setError("显示名必填"); return; }
    if (!form.category.trim()) { setError("分类必填"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/analytics/events", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim().toLowerCase(),
          displayName: form.displayName.trim(),
          category: form.category.trim().toLowerCase(),
          description: form.description.trim() || undefined,
          properties: [],
        }),
      });
      const parsed = await readAdminJson<{ ok?: boolean; id?: string; error?: string }>(res);
      if (!res.ok || !parsed.ok) throw new Error(parsed.ok ? (parsed.data.error ?? "创建失败") : parsed.message);
      toast.success("事件已注册");
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
        新建事件
      </button>

      {open && (
        <Drawer
          title="注册埋点事件"
          onClose={close}
          footer={
            <>
              <button type="button" onClick={close} className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-[#8E8E93] hover:bg-[#1A1A24]">取消</button>
              <button type="button" disabled={submitting} onClick={() => void handleSubmit()} className="rounded-xl bg-[#7C5CFC] px-5 py-2.5 text-[14px] font-semibold text-[#F5F5F7] disabled:opacity-50">
                {submitting ? "注册中…" : "注册"}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="事件名 *" hint="snake_case，如 started_quiz。注册后不可改。">
              <input value={form.name} onChange={(e) => update("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="started_quiz" className={inputClass} />
            </Field>
            <Field label="显示名 *" hint="中文名，用于 UI 展示。">
              <input value={form.displayName} onChange={(e) => update("displayName", e.target.value)} placeholder="开始测试" className={inputClass} />
            </Field>
            <Field label="分类 *" hint="如 quiz / payment / share。">
              <input value={form.category} onChange={(e) => update("category", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="quiz" className={inputClass} />
            </Field>
            <Field label="说明">
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="用户点击「开始测试」按钮时触发" rows={3} className={`${inputClass} resize-none`} />
            </Field>
            {error ? <div className="rounded-xl bg-[rgba(255,69,58,0.08)] px-3.5 py-2.5 text-[12.5px] text-[#FF453A] ring-1 ring-[rgba(255,69,58,0.24)]">{error}</div> : null}
          </div>
        </Drawer>
      )}
    </>
  );
}

function Actions({ event }: { event: Event }) {
  const router = useRouter();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function toggleStatus() {
    setToggling(true);
    try {
      const res = await fetch(`/api/admin/analytics/events/${event.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: event.status === "active" ? "deprecated" : "active" }),
      });
      const parsed = await readAdminJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !parsed.ok) throw new Error(parsed.ok ? (parsed.data.error ?? "操作失败") : parsed.message);
      toast.success(event.status === "active" ? "已标记为废弃" : "已恢复启用");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setToggling(false);
    }
  }

  async function deleteEvent() {
    const res = await fetch(`/api/admin/analytics/events/${event.id}`, { method: "DELETE", credentials: "include" });
    const parsed = await readAdminJson<{ ok?: boolean; error?: string }>(res);
    if (!res.ok || !parsed.ok) throw new Error(parsed.ok ? (parsed.data.error ?? "删除失败") : parsed.message);
    toast.success("事件已删除");
    setConfirmDelete(false);
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" disabled={toggling} onClick={() => void toggleStatus()} className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-[#8E8E93] hover:bg-[#1A1A24] hover:text-[#F5F5F7] disabled:opacity-50">
        {event.status === "active" ? "废弃" : "恢复"}
      </button>
      <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-[#FF453A] hover:bg-[rgba(255,69,58,0.08)]">
        删除
      </button>
      {confirmDelete && (
        <ConfirmDialog
          title={`删除事件 ${event.name}`}
          description="此操作不可撤销。若已有漏斗引用此事件名，漏斗仍保留（eventName 为字符串，不做 FK 校验）。"
          confirmLabel="删除"
          danger
          onConfirm={deleteEvent}
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

export { NewButton as EventsNewButton, Actions as EventsActions };
