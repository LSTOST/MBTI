"use client";

import { type ReactNode, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, DollarSign, Lock, Unlock, Gift } from "lucide-react";

type PricingMode = "free" | "paid_unlock" | "paid_entry";
type AccessMode = "public" | "redeem_required";

type Props = {
  testId: string;
  initialAccessMode: AccessMode;
  initialPricingMode: PricingMode;
  initialBasePrice: number; // cents
  initialAiPrice: number | null; // cents
};

type SaveState = "idle" | "saving" | "saved" | "error";

function yuanToCents(yuan: string): number {
  const n = parseFloat(yuan);
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function centsToYuan(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function PricingClient({
  testId,
  initialAccessMode,
  initialPricingMode,
  initialBasePrice,
  initialAiPrice,
}: Props) {
  const [accessMode, setAccessMode] = useState<AccessMode>(initialAccessMode);
  const [pricingMode, setPricingMode] = useState<PricingMode>(initialPricingMode);
  const [basePrice, setBasePrice] = useState(centsToYuan(initialBasePrice));
  const [aiPrice, setAiPrice] = useState(initialAiPrice != null ? centsToYuan(initialAiPrice) : "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isDirty =
    accessMode !== initialAccessMode ||
    pricingMode !== initialPricingMode ||
    yuanToCents(basePrice) !== initialBasePrice ||
    (aiPrice === "" ? null : yuanToCents(aiPrice)) !== initialAiPrice;

  async function handleSave() {
    setSaveState("saving");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/tests/${testId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessMode,
          pricingMode,
          basePrice: yuanToCents(basePrice),
          aiPrice: aiPrice.trim() === "" ? null : yuanToCents(aiPrice),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "保存失败");
        setSaveState("error");
        return;
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setErrorMsg("网络错误");
      setSaveState("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Access Mode */}
      <Section title="入场模式" icon={<Lock className="h-4 w-4" />}>
        <p className="text-[12px] leading-relaxed text-[#8E8E93]">
          控制用户能否直接进入测试，还是需要先验证兑换码。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ModeCard
            selected={accessMode === "public"}
            onClick={() => setAccessMode("public")}
            icon={<Unlock className="h-5 w-5" />}
            title="公开访问"
            desc="任何人均可直接进入答题，无需凭证。"
          />
          <ModeCard
            selected={accessMode === "redeem_required"}
            onClick={() => setAccessMode("redeem_required")}
            icon={<Lock className="h-5 w-5" />}
            title="兑换码准入"
            desc="用户进入测试前需输入有效兑换码，常用于内测或付费邀请。"
          />
        </div>
      </Section>

      {/* Pricing Mode */}
      <Section title="定价模式" icon={<DollarSign className="h-4 w-4" />}>
        <p className="text-[12px] leading-relaxed text-[#8E8E93]">
          决定用户答完后如何获取报告。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ModeCard
            selected={pricingMode === "free"}
            onClick={() => setPricingMode("free")}
            icon={<Gift className="h-5 w-5" />}
            title="免费"
            desc="答完即可查看完整报告，无需付费。"
          />
          <ModeCard
            selected={pricingMode === "paid_unlock"}
            onClick={() => setPricingMode("paid_unlock")}
            icon={<Lock className="h-5 w-5" />}
            title="付费解锁"
            desc="免费查看基础报告；付费后解锁完整内容。"
          />
          <ModeCard
            selected={pricingMode === "paid_entry"}
            onClick={() => setPricingMode("paid_entry")}
            icon={<DollarSign className="h-5 w-5" />}
            title="付费进入"
            desc="先付费再答题，一次付清获得完整报告。"
          />
        </div>
      </Section>

      {/* Price fields */}
      <Section title="价格设置" icon={<DollarSign className="h-4 w-4" />}>
        <div className="mt-1 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <PriceField
            label={pricingMode === "paid_entry" ? "入场价（元）" : "解锁价（元）"}
            hint={
              pricingMode === "free"
                ? "免费模式下此字段留空即可（会被忽略）"
                : "用户实付金额，单位：元"
            }
            value={basePrice}
            disabled={pricingMode === "free"}
            onChange={setBasePrice}
          />
          <PriceField
            label="AI 深度报告价（元）"
            hint="留空表示与主价格相同；单独定价时填写"
            value={aiPrice}
            onChange={setAiPrice}
            placeholder="留空 = 同主价"
          />
        </div>
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-4 flex items-center gap-3">
        <button
          type="button"
          disabled={!isDirty || saveState === "saving"}
          onClick={() => void handleSave()}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#7C5CFC] px-5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saveState === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
          保存定价配置
        </button>
        {saveState === "saved" && (
          <span className="flex items-center gap-1.5 text-[13px] text-[#30D158]">
            <CheckCircle2 className="h-4 w-4" /> 已保存
          </span>
        )}
        {saveState === "error" && (
          <span className="flex items-center gap-1.5 text-[13px] text-[#FF453A]">
            <AlertCircle className="h-4 w-4" /> {errorMsg}
          </span>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[#0E0E16] p-6 ring-1 ring-[#1A1A24]">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#F5F5F7]">
        <span className="text-[#7C5CFC]">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function ModeCard({
  selected,
  onClick,
  icon,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-2 rounded-xl p-4 text-left ring-1 transition-all ${
        selected
          ? "bg-[rgba(124,92,252,0.12)] ring-[#7C5CFC]"
          : "bg-[#1A1A24] ring-transparent hover:ring-[#48484A]"
      }`}
    >
      <span className={selected ? "text-[#7C5CFC]" : "text-[#8E8E93]"}>{icon}</span>
      <span className={`text-[13.5px] font-semibold ${selected ? "text-[#F5F5F7]" : "text-[#8E8E93]"}`}>
        {title}
      </span>
      <span className="text-[12px] leading-relaxed text-[#48484A]">{desc}</span>
    </button>
  );
}

function PriceField({
  label,
  hint,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-[#8E8E93]">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-[14px] text-[#48484A]">¥</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          disabled={disabled}
          placeholder={placeholder ?? "0.00"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-xl bg-[#1A1A24] px-4 text-[13.5px] text-[#F5F5F7] ring-1 ring-[#2C2C3A] placeholder:text-[#48484A] focus:outline-none focus:ring-[#7C5CFC] disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>
      <p className="text-[11px] text-[#48484A]">{hint}</p>
    </div>
  );
}
