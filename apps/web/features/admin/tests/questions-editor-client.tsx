"use client";

import { useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { readAdminJson } from "@/lib/admin-api-json";
import { useToast } from "@/features/admin/ui/toast";
import { Drawer } from "@/features/admin/ui/drawer";
import { ConfirmDialog } from "@/features/admin/ui/confirm-dialog";
import { EmptyState } from "@/features/admin/ui/empty-state";

type QuestionType = "likert_5" | "single_choice" | "multi_choice";

export type QuestionRow = {
  id: string;
  questionKey: string;
  orderIndex: number;
  type: QuestionType;
  prompt: string;
  dimension: string | null;
  config: Record<string, unknown>;
  updatedAt: string;
};

type State = {
  list: QuestionRow[];
  /** 拖拽中的源题序 */
  dragIdx: number | null;
  /** 当前悬停的位置 */
  hoverIdx: number | null;
};

type Action =
  | { type: "reset"; list: QuestionRow[] }
  | { type: "replace"; item: QuestionRow }
  | { type: "insert"; item: QuestionRow }
  | { type: "remove"; id: string }
  | { type: "reorder"; list: QuestionRow[] }
  | { type: "dragStart"; idx: number }
  | { type: "dragOver"; idx: number }
  | { type: "dragEnd" };

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case "reset":
      return { ...state, list: a.list };
    case "replace":
      return {
        ...state,
        list: state.list.map((q) => (q.id === a.item.id ? a.item : q)),
      };
    case "insert":
      return { ...state, list: [...state.list, a.item] };
    case "remove":
      return { ...state, list: state.list.filter((q) => q.id !== a.id) };
    case "reorder":
      return { ...state, list: a.list };
    case "dragStart":
      return { ...state, dragIdx: a.idx, hoverIdx: a.idx };
    case "dragOver":
      return { ...state, hoverIdx: a.idx };
    case "dragEnd":
      return { ...state, dragIdx: null, hoverIdx: null };
    default:
      return state;
  }
}

/**
 * 题目编辑器：左侧列表 + 右侧抽屉式编辑表单。
 *
 * 拖拽排序用 HTML5 原生 DnD，落位后调用 /reorder 持久化；
 * 新增 / 修改 / 删除分别走各自的 API。
 */
export function QuestionsEditorClient({
  testId,
  testSlug,
  initialQuestions,
}: {
  testId: string;
  testSlug: string;
  initialQuestions: QuestionRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, dispatch] = useReducer(reducer, {
    list: initialQuestions,
    dragIdx: null,
    hoverIdx: null,
  });
  const [editing, setEditing] = useState<{ mode: "create" } | { mode: "edit"; id: string } | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const editingQuestion = useMemo(() => {
    if (!editing || editing.mode !== "edit") return null;
    return state.list.find((q) => q.id === editing.id) ?? null;
  }, [editing, state.list]);

  async function persistOrder(nextList: QuestionRow[]) {
    setReordering(true);
    try {
      const res = await fetch(`/api/admin/tests/${testId}/questions/reorder`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: nextList.map((q) => q.id) }),
      });
      const parsed = await readAdminJson<{ ok?: boolean; changed?: number; error?: string }>(res);
      if (!res.ok || !parsed.ok) {
        throw new Error(parsed.ok ? parsed.data.error ?? "排序失败" : parsed.message);
      }
      if (parsed.data.changed && parsed.data.changed > 0) {
        toast.success(`已更新 ${parsed.data.changed} 道题目的顺序`);
      }
      // 刷新 updatedAt / orderIndex 映射
      dispatch({
        type: "reorder",
        list: nextList.map((q, idx) => ({ ...q, orderIndex: idx })),
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "排序失败");
      // 回滚到服务端为准：交给 router.refresh 刷新服务端态
      router.refresh();
    } finally {
      setReordering(false);
    }
  }

  function handleDragStart(idx: number, e: React.DragEvent) {
    dispatch({ type: "dragStart", idx });
    e.dataTransfer.effectAllowed = "move";
    // Safari 需要 setData 才会正常触发 dragover
    try { e.dataTransfer.setData("text/plain", String(idx)); } catch { /* noop */ }
  }

  function handleDragOver(idx: number, e: React.DragEvent) {
    e.preventDefault();
    if (state.dragIdx === null) return;
    if (state.hoverIdx !== idx) dispatch({ type: "dragOver", idx });
  }

  function handleDrop(idx: number, e: React.DragEvent) {
    e.preventDefault();
    const from = state.dragIdx;
    dispatch({ type: "dragEnd" });
    if (from === null || from === idx) return;
    const next = [...state.list];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    dispatch({ type: "reorder", list: next });
    void persistOrder(next);
  }

  function handleDragEnd() {
    dispatch({ type: "dragEnd" });
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/tests/${testId}/questions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const parsed = await readAdminJson<{ ok?: boolean; error?: string }>(res);
    if (!res.ok || !parsed.ok) {
      throw new Error(parsed.ok ? parsed.data.error ?? "删除失败" : parsed.message);
    }
    dispatch({ type: "remove", id });
    toast.success("已删除");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-[#8E8E93]">
          共 {state.list.length} 题 · 拖动
          <GripVertical className="mx-1 inline h-3 w-3 align-[-1px] text-[#48484A]" />
          可调整顺序，点击卡片编辑题目内容。
          {reordering ? <span className="ml-2 text-[#7C5CFC]">保存顺序中…</span> : null}
        </p>
        <button
          type="button"
          onClick={() => setEditing({ mode: "create" })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#7C5CFC] px-3.5 py-2 text-[13px] font-semibold text-[#F5F5F7] shadow-[0_0_16px_rgba(124,92,252,0.2)] hover:bg-[#8a6dff]"
        >
          <Plus className="h-4 w-4" />
          新增题目
        </button>
      </div>

      {state.list.length === 0 ? (
        <EmptyState
          title="尚无题目"
          description="点击右上角「新增题目」开始录入。已发布测试需要至少达到策略规定的题数才能再次发布。"
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {state.list.map((q, idx) => {
            const isDragging = state.dragIdx === idx;
            const isHover = state.hoverIdx === idx && state.dragIdx !== null && state.dragIdx !== idx;
            return (
              <li
                key={q.id}
                draggable
                onDragStart={(e) => handleDragStart(idx, e)}
                onDragOver={(e) => handleDragOver(idx, e)}
                onDrop={(e) => handleDrop(idx, e)}
                onDragEnd={handleDragEnd}
                className={`group flex items-start gap-3 rounded-2xl bg-[#111118] p-4 ring-1 transition ${
                  isDragging
                    ? "opacity-40 ring-[#7C5CFC]"
                    : isHover
                      ? "ring-[#7C5CFC]"
                      : "ring-[#1A1A24] hover:ring-[#2A2A34]"
                }`}
              >
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-[#48484A] hover:bg-[#1A1A24] hover:text-[#8E8E93] active:cursor-grabbing"
                  aria-label="拖动以排序"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
                <button
                  type="button"
                  onClick={() => setEditing({ mode: "edit", id: q.id })}
                  className="flex min-w-0 flex-1 flex-col gap-1.5 text-left"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex h-5 min-w-[26px] items-center justify-center rounded-md bg-[#1A1A24] px-1.5 font-mono text-[11px] text-[#8E8E93]">
                      {idx + 1}
                    </span>
                    <span className="font-mono text-[11px] text-[#48484A]">{q.questionKey}</span>
                    {q.dimension ? (
                      <span className="rounded-full bg-[rgba(124,92,252,0.14)] px-2 py-0.5 text-[10.5px] text-[#C4B5FD]">
                        {q.dimension}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-[#1A1A24] px-2 py-0.5 text-[10.5px] text-[#8E8E93]">
                      {typeLabel(q.type)}
                    </span>
                  </div>
                  <p className="truncate text-[14px] leading-snug text-[#F5F5F7]">{q.prompt}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(q.id)}
                  className="rounded-lg p-1.5 text-[#48484A] opacity-0 transition hover:bg-[rgba(255,69,58,0.12)] hover:text-[#FF453A] group-hover:opacity-100"
                  aria-label="删除题目"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editing ? (
        <QuestionFormDrawer
          testId={testId}
          testSlug={testSlug}
          existing={editingQuestion}
          existingKeys={state.list.map((q) => q.questionKey)}
          onClose={() => setEditing(null)}
          onCreated={(item) => {
            dispatch({ type: "insert", item });
            setEditing(null);
            toast.success("已新增题目");
            router.refresh();
          }}
          onUpdated={(item) => {
            dispatch({ type: "replace", item });
            setEditing(null);
            toast.success("已保存");
            router.refresh();
          }}
        />
      ) : null}

      {deleteId ? (
        <ConfirmDialog
          title="删除题目"
          description={
            <>
              删除后该题从此测试中永久消失。历史报告不受影响，但这会改变后续答题体验。
            </>
          }
          confirmLabel="删除"
          danger
          onClose={() => setDeleteId(null)}
          onConfirm={async () => {
            await handleDelete(deleteId);
            setDeleteId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function typeLabel(t: QuestionType): string {
  if (t === "likert_5") return "5 级量表";
  if (t === "single_choice") return "单选";
  return "多选";
}

// ────────────────────────────────────────────────────────────
// 表单抽屉
// ────────────────────────────────────────────────────────────

type FormState = {
  questionKey: string;
  type: QuestionType;
  prompt: string;
  dimension: string;
  // likert_5
  leftPole: string;
  rightPole: string;
  leftLabel: string;
  rightLabel: string;
  facet: string;
  /// choice config 以 JSON 文本编辑，落库再解析
  configJson: string;
};

function toForm(q: QuestionRow | null): FormState {
  if (!q) {
    return {
      questionKey: "",
      type: "likert_5",
      prompt: "",
      dimension: "",
      leftPole: "",
      rightPole: "",
      leftLabel: "",
      rightLabel: "",
      facet: "",
      configJson: "{\n  \"options\": [\n    { \"key\": \"A\", \"label\": \"\" },\n    { \"key\": \"B\", \"label\": \"\" }\n  ]\n}",
    };
  }
  const cfg = (q.config as Record<string, unknown>) ?? {};
  return {
    questionKey: q.questionKey,
    type: q.type,
    prompt: q.prompt,
    dimension: q.dimension ?? "",
    leftPole: String(cfg.leftPole ?? ""),
    rightPole: String(cfg.rightPole ?? ""),
    leftLabel: String(cfg.leftLabel ?? ""),
    rightLabel: String(cfg.rightLabel ?? ""),
    facet: String(cfg.facet ?? ""),
    configJson: JSON.stringify(cfg, null, 2),
  };
}

function buildConfig(form: FormState): { ok: true; config: Record<string, unknown> } | { ok: false; error: string } {
  if (form.type === "likert_5") {
    const out: Record<string, unknown> = {};
    if (form.leftPole.trim()) out.leftPole = form.leftPole.trim();
    if (form.rightPole.trim()) out.rightPole = form.rightPole.trim();
    if (form.leftLabel.trim()) out.leftLabel = form.leftLabel.trim();
    if (form.rightLabel.trim()) out.rightLabel = form.rightLabel.trim();
    if (form.facet.trim()) out.facet = form.facet.trim();
    return { ok: true, config: out };
  }
  try {
    const parsed = JSON.parse(form.configJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "config 必须是 JSON 对象" };
    }
    const options = (parsed as { options?: unknown }).options;
    if (!Array.isArray(options) || options.length < 2) {
      return { ok: false, error: "options 至少需要 2 项" };
    }
    return { ok: true, config: parsed as Record<string, unknown> };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "JSON 解析失败" };
  }
}

function QuestionFormDrawer({
  testId,
  testSlug,
  existing,
  existingKeys,
  onClose,
  onCreated,
  onUpdated,
}: {
  testId: string;
  testSlug: string;
  existing: QuestionRow | null;
  existingKeys: string[];
  onClose: () => void;
  onCreated: (item: QuestionRow) => void;
  onUpdated: (item: QuestionRow) => void;
}) {
  const isEdit = !!existing;
  const [form, setForm] = useState<FormState>(() => toForm(existing));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function handleSubmit() {
    setError("");

    const key = form.questionKey.trim();
    if (!key) {
      setError("questionKey 必填");
      return;
    }
    if (!/^[A-Za-z0-9_\-]+$/.test(key)) {
      setError("questionKey 仅允许字母/数字/下划线/短横线");
      return;
    }
    if (
      (!isEdit && existingKeys.includes(key)) ||
      (isEdit && existing && existing.questionKey !== key && existingKeys.includes(key))
    ) {
      setError(`questionKey "${key}" 已存在`);
      return;
    }
    if (!form.prompt.trim()) {
      setError("题干必填");
      return;
    }
    const built = buildConfig(form);
    if (!built.ok) {
      setError(built.error);
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        questionKey: key,
        type: form.type,
        prompt: form.prompt.trim(),
        dimension: form.dimension.trim() ? form.dimension.trim() : null,
        config: built.config,
      };

      const url = isEdit
        ? `/api/admin/tests/${testId}/questions/${existing!.id}`
        : `/api/admin/tests/${testId}/questions`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const parsed = await readAdminJson<{
        ok?: boolean;
        item?: QuestionRow;
        error?: string;
        details?: unknown;
      }>(res);
      if (!res.ok || !parsed.ok) {
        throw new Error(parsed.ok ? parsed.data.error ?? "保存失败" : parsed.message);
      }
      const item = parsed.data.item;
      if (!item) throw new Error("服务端未返回题目");
      if (isEdit) onUpdated(item);
      else onCreated(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      title={isEdit ? "编辑题目" : "新增题目"}
      onClose={onClose}
      width="lg"
      footer={
        <>
          <span className="mr-auto self-center text-[11.5px] text-[#48484A]">
            测试 <code className="font-mono">/{testSlug}</code>
          </span>
          <button
            type="button"
            onClick={onClose}
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
            {submitting ? "保存中…" : isEdit ? "保存" : "创建"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="questionKey" hint="业务键，跨版本稳定，例：EI-1">
          <input
            value={form.questionKey}
            onChange={(e) => update("questionKey", e.target.value)}
            placeholder="EI-1"
            className={inputClass}
          />
        </Field>

        <Field label="题干" hint="用户在答题流程中看到的文字。">
          <textarea
            value={form.prompt}
            onChange={(e) => update("prompt", e.target.value)}
            rows={3}
            className={`${inputClass} resize-y leading-relaxed`}
            placeholder="在聚会中，我更倾向于主动和陌生人交谈。"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="题型">
            <select
              value={form.type}
              onChange={(e) => update("type", e.target.value as QuestionType)}
              className={inputClass}
            >
              <option value="likert_5">5 级量表（Likert）</option>
              <option value="single_choice">单选</option>
              <option value="multi_choice">多选</option>
            </select>
          </Field>
          <Field label="维度 / dimension" hint="可选。MBTI 用 EI/SN/TF/JP。">
            <input
              value={form.dimension}
              onChange={(e) => update("dimension", e.target.value)}
              placeholder="EI"
              className={inputClass}
            />
          </Field>
        </div>

        {form.type === "likert_5" ? (
          <div className="flex flex-col gap-4 rounded-2xl bg-[#0A0A0F] p-4 ring-1 ring-[#1A1A24]">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[#48484A]">
              Likert 两极
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="leftPole" hint="选 1 分时的倾向，如 E">
                <input
                  value={form.leftPole}
                  onChange={(e) => update("leftPole", e.target.value)}
                  placeholder="E"
                  className={inputClass}
                />
              </Field>
              <Field label="rightPole" hint="选 5 分时的倾向，如 I">
                <input
                  value={form.rightPole}
                  onChange={(e) => update("rightPole", e.target.value)}
                  placeholder="I"
                  className={inputClass}
                />
              </Field>
              <Field label="leftLabel">
                <input
                  value={form.leftLabel}
                  onChange={(e) => update("leftLabel", e.target.value)}
                  placeholder="非常不同意"
                  className={inputClass}
                />
              </Field>
              <Field label="rightLabel">
                <input
                  value={form.rightLabel}
                  onChange={(e) => update("rightLabel", e.target.value)}
                  placeholder="非常同意"
                  className={inputClass}
                />
              </Field>
              <Field label="facet" hint="可选，子维度标识（如 EI.warmth）。">
                <input
                  value={form.facet}
                  onChange={(e) => update("facet", e.target.value)}
                  placeholder="EI.warmth"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        ) : (
          <Field
            label="config JSON"
            hint={'单/多选的 options 等字段。格式：{ "options": [{ "key": "A", "label": "..." }, ...] }'}
          >
            <textarea
              value={form.configJson}
              onChange={(e) => update("configJson", e.target.value)}
              rows={10}
              className={`${inputClass} font-mono text-[12px] leading-relaxed`}
            />
          </Field>
        )}

        {error ? (
          <div
            className="rounded-xl bg-[rgba(255,69,58,0.08)] px-3.5 py-2.5 text-[12.5px] text-[#FF453A] ring-1 ring-[rgba(255,69,58,0.24)]"
            role="alert"
          >
            {error}
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

const inputClass =
  "w-full rounded-xl bg-[#0A0A0F] px-3 py-2 text-[13.5px] text-[#F5F5F7] ring-1 ring-[#1A1A24] placeholder:text-[#48484A] focus:outline-none focus:ring-[#7C5CFC]";

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
