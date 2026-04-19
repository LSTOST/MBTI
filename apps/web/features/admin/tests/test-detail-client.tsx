"use client";

import { useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";

import { readAdminJson } from "@/lib/admin-api-json";
import { useToast } from "@/features/admin/ui/toast";
import { ConfirmDialog } from "@/features/admin/ui/confirm-dialog";

type TestStatus = "draft" | "published" | "archived";
type AccessMode = "public" | "redeem_required";
type PricingMode = "free" | "paid_unlock" | "paid_entry";

export type TestDetailData = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  coverImage: string | null;
  status: TestStatus;
  accessMode: AccessMode;
  pricingMode: PricingMode;
  basePrice: number;
  aiPrice: number | null;
  reportStrategy: string;
  sortOrder: number;
  publishedAt: string | null;
  counts: { questions: number; reports: number };
};

export type StrategyOption = {
  id: string;
  displayName: string;
  minQuestions: number;
};

type FormState = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  coverImage: string;
  accessMode: AccessMode;
  pricingMode: PricingMode;
  /** 元：分 */
  basePrice: number;
  aiPrice: number | null;
  reportStrategy: string;
  sortOrder: number;
};

type Action =
  | { type: "set"; field: keyof FormState; value: unknown }
  | { type: "reset"; state: FormState };

function reducer(state: FormState, a: Action): FormState {
  if (a.type === "reset") return a.state;
  return { ...state, [a.field]: a.value };
}

function toForm(t: TestDetailData): FormState {
  return {
    name: t.name,
    slug: t.slug,
    tagline: t.tagline ?? "",
    description: t.description ?? "",
    coverImage: t.coverImage ?? "",
    accessMode: t.accessMode,
    pricingMode: t.pricingMode,
    basePrice: t.basePrice,
    aiPrice: t.aiPrice,
    reportStrategy: t.reportStrategy,
    sortOrder: t.sortOrder,
  };
}

/** 差异比对：只把改动字段拿出来提交，减少 PATCH 副作用。 */
function diffPayload(initial: FormState, current: FormState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys: (keyof FormState)[] = [
    "name",
    "slug",
    "tagline",
    "description",
    "coverImage",
    "accessMode",
    "pricingMode",
    "basePrice",
    "aiPrice",
    "reportStrategy",
    "sortOrder",
  ];
  for (const k of keys) {
    if (initial[k] === current[k]) continue;
    if (k === "tagline" || k === "description" || k === "coverImage") {
      out[k] = (current[k] as string).length > 0 ? current[k] : null;
    } else {
      out[k] = current[k];
    }
  }
  return out;
}

export function TestDetailClient({
  test,
  strategies,
}: {
  test: TestDetailData;
  strategies: StrategyOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const initial = useMemo(() => toForm(test), [test]);
  const [form, dispatch] = useReducer(reducer, initial);
  const [busy, setBusy] = useState<false | "save" | "publish" | "archive" | "restore" | "delete">(false);
  const [serverError, setServerError] = useState<string>("");
  const [confirm, setConfirm] = useState<null | "archive" | "restore" | "delete">(null);

  const payload = diffPayload(initial, form);
  const dirty = Object.keys(payload).length > 0;

  async function save() {
    setServerError("");
    if (!dirty) return;
    setBusy("save");
    try {
      const res = await fetch(`/api/admin/tests/${test.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const parsed = await readAdminJson<{ error?: string; details?: unknown }>(res);
      if (!parsed.ok) {
        setServerError(parsed.message);
        return;
      }
      if (!res.ok) {
        setServerError(parsed.data.error || "保存失败");
        return;
      }
      toast.success("已保存");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setServerError("");
    setBusy("publish");
    try {
      const res = await fetch(`/api/admin/tests/${test.id}/publish`, {
        method: "POST",
        credentials: "include",
      });
      const parsed = await readAdminJson<{ error?: string; issues?: string[] }>(res);
      if (!parsed.ok) {
        setServerError(parsed.message);
        return;
      }
      if (!res.ok) {
        const base = parsed.data.error || "发布失败";
        const detail = parsed.data.issues?.length ? `：${parsed.data.issues.join("; ")}` : "";
        setServerError(base + detail);
        return;
      }
      toast.success("已发布");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function archiveAction(action: "archive" | "restore") {
    setServerError("");
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/tests/${test.id}/archive`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const parsed = await readAdminJson<{ error?: string }>(res);
      if (!parsed.ok) {
        setServerError(parsed.message);
        return;
      }
      if (!res.ok) {
        setServerError(parsed.data.error || (action === "archive" ? "归档失败" : "恢复失败"));
        return;
      }
      toast.success(action === "archive" ? "已归档" : "已恢复为草稿");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    setServerError("");
    setBusy("delete");
    try {
      const res = await fetch(`/api/admin/tests/${test.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const parsed = await readAdminJson<{ error?: string }>(res);
      if (!parsed.ok) {
        setServerError(parsed.message);
        return;
      }
      if (!res.ok) {
        setServerError(parsed.data.error || "删除失败");
        return;
      }
      toast.success("已删除");
      router.push("/admin/tests");
    } finally {
      setBusy(false);
    }
  }

  const canDelete = test.status === "draft" && test.counts.reports === 0;

  return (
    <div className="flex flex-col gap-5">
      {/* 顶部动作栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#111118] px-5 py-3 ring-1 ring-[#1A1A24]">
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#8E8E93]">
          <span>题目 <strong className="text-[#F5F5F7]">{test.counts.questions}</strong></span>
          <span className="text-[#2A2A36]">·</span>
          <span>报告 <strong className="text-[#F5F5F7]">{test.counts.reports}</strong></span>
          <span className="text-[#2A2A36]">·</span>
          <span>
            发布时间 <strong className="text-[#E8E8ED]">{test.publishedAt ? formatDate(test.publishedAt) : "—"}</strong>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || !!busy}
            className="rounded-xl bg-[#7C5CFC] px-4 py-2 text-[13px] font-semibold text-[#F5F5F7] disabled:opacity-40"
          >
            {busy === "save" ? "保存中…" : "保存更改"}
          </button>
          {test.status === "draft" || test.status === "published" ? (
            <button
              type="button"
              onClick={() => void publish()}
              disabled={!!busy || dirty}
              title={dirty ? "请先保存再发布" : undefined}
              className="rounded-xl bg-[#1A1A24] px-4 py-2 text-[13px] font-medium text-[#C4B5FC] hover:bg-[#22222e] disabled:opacity-40"
            >
              {busy === "publish" ? "发布中…" : test.status === "draft" ? "发布" : "重新发布"}
            </button>
          ) : null}
          {test.status === "archived" ? (
            <button
              type="button"
              onClick={() => setConfirm("restore")}
              disabled={!!busy}
              className="rounded-xl bg-[#1A1A24] px-4 py-2 text-[13px] font-medium text-[#E8E8ED] hover:bg-[#22222e] disabled:opacity-40"
            >
              恢复为草稿
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirm("archive")}
              disabled={!!busy}
              className="rounded-xl bg-[#1A1A24] px-4 py-2 text-[13px] font-medium text-[#8E8E93] hover:text-[#E8E8ED] disabled:opacity-40"
            >
              归档
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirm("delete")}
            disabled={!canDelete || !!busy}
            title={!canDelete ? "仅草稿态且无报告可删除" : undefined}
            className="rounded-xl bg-[rgba(255,69,58,0.1)] px-4 py-2 text-[13px] font-medium text-[#FF453A] hover:bg-[rgba(255,69,58,0.18)] disabled:opacity-30"
          >
            删除
          </button>
        </div>
      </div>

      {serverError ? (
        <p className="rounded-xl bg-[rgba(255,69,58,0.08)] px-4 py-3 text-[13px] text-[#FF453A]" role="alert">
          {serverError}
        </p>
      ) : null}

      {/* 基本信息 */}
      <Section title="基本信息">
        <Grid>
          <Field label="测试名" hint="显示在首页卡片 / 报告页标题等。">
            <input
              type="text"
              value={form.name}
              onChange={(e) => dispatch({ type: "set", field: "name", value: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="slug" hint="URL 片段（/quiz/<slug>），仅小写字母/数字/短横。">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => dispatch({ type: "set", field: "slug", value: e.target.value })}
              className={inputCls + " font-mono"}
            />
          </Field>
        </Grid>
        <Field label="副标题 tagline" hint="首页卡片上的一句话，最长 200 字。">
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => dispatch({ type: "set", field: "tagline", value: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="长描述" hint="详情页、分享摘要可用。支持换行。">
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => dispatch({ type: "set", field: "description", value: e.target.value })}
            className={`${inputCls} resize-y`}
          />
        </Field>
        <Field label="封面图 URL">
          <input
            type="url"
            value={form.coverImage}
            onChange={(e) => dispatch({ type: "set", field: "coverImage", value: e.target.value })}
            placeholder="https://…"
            className={inputCls + " font-mono"}
          />
        </Field>
      </Section>

      {/* 入口与定价 */}
      <Section title="入口与定价">
        <Grid>
          <Field label="入口模式">
            <select
              value={form.accessMode}
              onChange={(e) => dispatch({ type: "set", field: "accessMode", value: e.target.value })}
              className={inputCls}
            >
              <option value="public">公开（任何人可开测）</option>
              <option value="redeem_required">需要兑换码准入</option>
            </select>
          </Field>
          <Field label="定价模式">
            <select
              value={form.pricingMode}
              onChange={(e) => dispatch({ type: "set", field: "pricingMode", value: e.target.value })}
              className={inputCls}
            >
              <option value="free">免费（报告也免费）</option>
              <option value="paid_unlock">免费答题，付费解锁报告（MBTI 模式）</option>
              <option value="paid_entry">入场即付费</option>
            </select>
          </Field>
          <Field label={`基础价（分，当前约 ¥${(form.basePrice / 100).toFixed(2)}）`}>
            <input
              type="number"
              min={0}
              step={10}
              value={form.basePrice}
              onChange={(e) =>
                dispatch({ type: "set", field: "basePrice", value: Number(e.target.value) })
              }
              className={inputCls}
              disabled={form.pricingMode === "free"}
            />
          </Field>
          <Field
            label={`AI 深度报告价（分，当前约 ¥${form.aiPrice ? (form.aiPrice / 100).toFixed(2) : "0"}）`}
            hint="仅对 paid_unlock 生效；留空则不提供 AI 报告。"
          >
            <input
              type="number"
              min={0}
              step={10}
              value={form.aiPrice ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                dispatch({
                  type: "set",
                  field: "aiPrice",
                  value: raw === "" ? null : Number(raw),
                });
              }}
              className={inputCls}
              disabled={form.pricingMode !== "paid_unlock"}
            />
          </Field>
        </Grid>
      </Section>

      {/* 策略与排序 */}
      <Section title="策略与排序">
        <Grid>
          <Field label="reportStrategy" hint="决定报告生成的计算引擎。改动后需补 scoringConfig 方可发布。">
            <select
              value={form.reportStrategy}
              onChange={(e) =>
                dispatch({ type: "set", field: "reportStrategy", value: e.target.value })
              }
              className={inputCls}
            >
              {!strategies.find((s) => s.id === form.reportStrategy) ? (
                <option value={form.reportStrategy}>{form.reportStrategy}（未注册）</option>
              ) : null}
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}（≥ {s.minQuestions} 题）
                </option>
              ))}
            </select>
          </Field>
          <Field label="展示顺序 sortOrder" hint="首页列表按升序排。">
            <input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) =>
                dispatch({ type: "set", field: "sortOrder", value: Number(e.target.value) })
              }
              className={inputCls}
            />
          </Field>
        </Grid>
      </Section>

      {/* 确认弹层 */}
      {confirm === "archive" ? (
        <ConfirmDialog
          title="确认归档"
          description="归档后测试将从首页列表隐藏，但历史报告保留。随时可以恢复为草稿。"
          confirmLabel="归档"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            setConfirm(null);
            await archiveAction("archive");
          }}
        />
      ) : null}
      {confirm === "restore" ? (
        <ConfirmDialog
          title="恢复为草稿"
          description="测试将置回 draft 状态。若要重新上架，需走发布流程重新校验。"
          confirmLabel="恢复"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            setConfirm(null);
            await archiveAction("restore");
          }}
        />
      ) : null}
      {confirm === "delete" ? (
        <ConfirmDialog
          title="确认删除测试"
          description={
            <>
              此操作不可撤销。仅草稿态且无报告关联的测试可删除。
              <br />
              slug：<code className="font-mono">{test.slug}</code>
            </>
          }
          confirmLabel="删除"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            setConfirm(null);
            await del();
          }}
        />
      ) : null}
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-xl bg-[#0A0A0F] px-3 text-[13.5px] text-[#F5F5F7] outline-none ring-1 ring-[#2A2A36] placeholder:text-[#48484A] focus:ring-[#7C5CFC] disabled:opacity-50";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-[#111118] p-5 ring-1 ring-[#1A1A24]">
      <h3 className="text-[13px] font-semibold text-[#E8E8ED]">{title}</h3>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

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
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-[#8E8E93]">{label}</span>
      {children}
      {hint ? <span className="text-[11px] leading-relaxed text-[#48484A]">{hint}</span> : null}
    </label>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  if (y <= 1970) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
