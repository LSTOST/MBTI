"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { readAdminJson } from "@/lib/admin-api-json";
import { useToast } from "@/features/admin/ui/toast";

type Strategy = { id: string; displayName: string; description: string };
type ValidationResult = { ok: true } | { ok: false; errors: string[] };

export function ScoringConfigClient({
  testId,
  reportStrategy,
  scoringConfig,
  strategies,
  initialValidation,
}: {
  testId: string;
  reportStrategy: string;
  scoringConfig: Record<string, unknown>;
  strategies: Strategy[];
  initialValidation: ValidationResult;
}) {
  const router = useRouter();
  const toast = useToast();
  const [json, setJson] = useState(() => JSON.stringify(scoringConfig, null, 2));
  const [clientValidation, setClientValidation] = useState<{ ok: boolean; errors: string[] }>({
    ok: initialValidation.ok,
    errors: initialValidation.ok ? [] : initialValidation.errors,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const isDirty = useMemo(
    () => json !== JSON.stringify(scoringConfig, null, 2),
    [json, scoringConfig],
  );

  const validateClient = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setClientValidation({ ok: false, errors: ["必须是 JSON 对象"] });
      } else {
        setClientValidation({ ok: true, errors: [] });
      }
    } catch {
      setClientValidation({ ok: false, errors: ["JSON 语法错误"] });
    }
  }, []);

  function handleChange(text: string) {
    setJson(text);
    validateClient(text);
  }

  async function handleSave() {
    setSaveError("");
    if (!clientValidation.ok) {
      setSaveError("请先修复 JSON 格式错误");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setSaveError("JSON 解析失败");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tests/${testId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoringConfig: parsed }),
      });
      const result = await readAdminJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !result.ok) {
        throw new Error(result.ok ? result.data.error ?? "保存失败" : result.message);
      }
      toast.success("计分配置已保存");
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const strategy = strategies.find((s) => s.id === reportStrategy);

  return (
    <div className="flex flex-col gap-5">
      {/* 策略说明 */}
      <div className="rounded-2xl bg-[#111118] p-5 ring-1 ring-[#1A1A24]">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[#F5F5F7]">
              策略：{strategy?.displayName ?? reportStrategy}
            </p>
            {strategy?.description ? (
              <p className="mt-1 text-[12px] leading-snug text-[#8E8E93]">
                {strategy.description}
              </p>
            ) : null}
            {!strategy ? (
              <p className="mt-1 text-[12px] text-[#FF9F0A]">
                ⚠ 该策略未在代码注册表中找到，发布将会失败。请回到「概览」更换策略。
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* 策略专属引导 */}
      {reportStrategy === "mbti_compatibility" && (
        <MbtiCompatibilityGuide />
      )}
      {reportStrategy === "mbti_facet" && (
        <MbtiFacetGuide />
      )}

      {/* JSON 编辑器 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-medium text-[#8E8E93]">scoringConfig（JSON）</p>
          <div className="flex items-center gap-2">
            {clientValidation.ok ? (
              <span className="text-[11.5px] text-[#30D158]">✓ JSON 有效</span>
            ) : (
              <span className="text-[11.5px] text-[#FF453A]">✗ JSON 无效</span>
            )}
          </div>
        </div>
        <textarea
          value={json}
          onChange={(e) => handleChange(e.target.value)}
          rows={20}
          spellCheck={false}
          className="w-full rounded-2xl bg-[#0A0A0F] px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-[#F5F5F7] ring-1 ring-[#1A1A24] focus:outline-none focus:ring-[#7C5CFC]"
        />

        {clientValidation.errors.length > 0 && (
          <ul className="flex flex-col gap-1">
            {clientValidation.errors.map((e, i) => (
              <li key={i} className="font-mono text-[11.5px] text-[#FF453A]">
                {e}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 保存操作 */}
      {saveError ? (
        <div className="rounded-xl bg-[rgba(255,69,58,0.08)] px-4 py-3 text-[13px] text-[#FF453A] ring-1 ring-[rgba(255,69,58,0.24)]">
          {saveError}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving || !isDirty || !clientValidation.ok}
          onClick={() => void handleSave()}
          className="rounded-xl bg-[#7C5CFC] px-5 py-2.5 text-[14px] font-semibold text-[#F5F5F7] shadow-[0_0_16px_rgba(124,92,252,0.2)] hover:bg-[#8a6dff] disabled:opacity-40"
        >
          {saving ? "保存中…" : isDirty ? "保存配置" : "已是最新"}
        </button>
      </div>
    </div>
  );
}

// ─── 策略专属引导 ────────────────────────────────────────────

function MbtiCompatibilityGuide() {
  return (
    <details className="group rounded-2xl bg-[#111118] ring-1 ring-[#1A1A24]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
        <span className="text-[13px] font-medium text-[#F5F5F7]">
          mbti_compatibility 配置说明
        </span>
        <span className="text-[11px] text-[#48484A] group-open:hidden">展开</span>
        <span className="hidden text-[11px] text-[#48484A] group-open:inline">收起</span>
      </summary>
      <div className="border-t border-[#1A1A24] px-5 py-4">
        <pre className="overflow-x-auto text-[11.5px] leading-relaxed text-[#8E8E93]">
{`{
  "dimensions": ["EI", "SN", "TF", "JP"],   // 固定 4 个维度
  "poles": {
    "EI": { "left": "E", "right": "I", "tieBreaker": "I" },
    "SN": { "left": "S", "right": "N", "tieBreaker": "N" },
    "TF": { "left": "T", "right": "F", "tieBreaker": "F" },
    "JP": { "left": "J", "right": "P", "tieBreaker": "J" }
  },
  "likert": { "min": 1, "max": 5, "centerValue": 3 }
}`}
        </pre>
        <p className="mt-3 text-[11.5px] leading-relaxed text-[#48484A]">
          <strong className="text-[#8E8E93]">left / right</strong>：该维度 1 分端和 5 分端对应的字母。
          &nbsp;<strong className="text-[#8E8E93]">tieBreaker</strong>：平票时倒向的一极。
          &nbsp;<strong className="text-[#8E8E93]">centerValue</strong>：Likert 中性值，低于该值权重为负。
        </p>
      </div>
    </details>
  );
}

function MbtiFacetGuide() {
  return (
    <details className="group rounded-2xl bg-[#111118] ring-1 ring-[#1A1A24]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
        <span className="text-[13px] font-medium text-[#F5F5F7]">
          mbti_facet 配置说明
        </span>
        <span className="text-[11px] text-[#48484A] group-open:hidden">展开</span>
        <span className="hidden text-[11px] text-[#48484A] group-open:inline">收起</span>
      </summary>
      <div className="border-t border-[#1A1A24] px-5 py-4">
        <pre className="overflow-x-auto text-[11.5px] leading-relaxed text-[#8E8E93]">
{`{
  "dimensions": ["EI", "SN", "TF", "JP"],
  "facets": {
    "EI.warmth": {
      "dimension": "EI",
      "label": "热情度",
      "leftPoleLabel": "内敛",
      "rightPoleLabel": "热情"
    }
    // ... 共 12 个 facet
  },
  "likert": { "min": 1, "max": 5, "centerValue": 3 }
}`}
        </pre>
        <p className="mt-3 text-[11.5px] leading-relaxed text-[#48484A]">
          每个 facet 的 key 由 <code>维度.短标识</code> 构成，与题目的 <code>dimension</code> / <code>config.facet</code> 对应。
        </p>
      </div>
    </details>
  );
}
