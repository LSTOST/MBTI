"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { readAdminJson } from "@/lib/admin-api-json";
import { useToast } from "@/features/admin/ui/toast";
import { ConfirmDialog } from "@/features/admin/ui/confirm-dialog";

type Use = { id: string; orderId: string; userId: string; discount: number; createdAt: string };

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  scope: string;
  testName: string | null;
  minAmount: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  perUserLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
  note: string | null;
  createdAt: string;
  uses: Use[];
};

export function CouponDetailClient({ coupon: initial }: { coupon: Coupon }) {
  const router = useRouter();
  const toast = useToast();
  const [coupon, setCoupon] = useState(initial);
  const [toggling, setToggling] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  async function toggleActive() {
    setToggling(true);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !coupon.active }),
      });
      const parsed = await readAdminJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !parsed.ok) {
        throw new Error(parsed.ok ? parsed.data.error ?? "操作失败" : parsed.message);
      }
      setCoupon((c) => ({ ...c, active: !c.active }));
      toast.success(coupon.active ? "已停用" : "已启用");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const parsed = await readAdminJson<{ ok?: boolean; error?: string }>(res);
    if (!res.ok || !parsed.ok) {
      throw new Error(parsed.ok ? parsed.data.error ?? "删除失败" : parsed.message);
    }
    toast.success("已删除");
    router.push("/admin/coupons");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 基本信息 */}
      <div className="flex flex-col divide-y divide-[#1A1A24] rounded-2xl bg-[#111118] ring-1 ring-[#1A1A24]">
        <Row label="优惠码"><code className="font-mono">{coupon.code}</code></Row>
        <Row label="类型">{coupon.type === "percent_off" ? "百分比折扣" : "固定减额"}</Row>
        <Row label="折扣值">
          {coupon.type === "percent_off"
            ? `${coupon.value}%`
            : `¥${(coupon.value / 100).toFixed(2)}`}
        </Row>
        <Row label="适用范围">
          {coupon.scope === "global" ? "全站通用" : `仅 ${coupon.testName ?? "指定测试"}`}
        </Row>
        <Row label="最低消费">
          {coupon.minAmount > 0 ? `¥${(coupon.minAmount / 100).toFixed(2)}` : "不限"}
        </Row>
        <Row label="单人上限">{coupon.perUserLimit ?? "不限"} 次</Row>
        <Row label="有效期">
          {coupon.startsAt && `${new Date(coupon.startsAt).toLocaleDateString("zh-CN")} 起 · `}
          {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString("zh-CN") + " 止" : "永久"}
        </Row>
        {coupon.note && <Row label="备注">{coupon.note}</Row>}
        <Row label="创建时间">{new Date(coupon.createdAt).toLocaleString("zh-CN")}</Row>
      </div>

      {/* 操作区 */}
      <div className="flex flex-col gap-3 rounded-2xl bg-[#111118] p-5 ring-1 ring-[#1A1A24]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#48484A]">
          运营操作
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={toggling}
            onClick={() => void toggleActive()}
            className={`rounded-xl px-4 py-2.5 text-[13px] font-medium transition disabled:opacity-50 ${
              coupon.active
                ? "bg-[#1A1A24] text-[#FF9F0A] hover:bg-[#24242F]"
                : "bg-[rgba(48,209,88,0.12)] text-[#30D158] hover:bg-[rgba(48,209,88,0.2)]"
            }`}
          >
            {toggling ? "处理中…" : coupon.active ? "停用此码" : "启用此码"}
          </button>
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            disabled={coupon.redemptionCount > 0}
            title={coupon.redemptionCount > 0 ? "已有使用记录，无法删除。请停用代替。" : ""}
            className="rounded-xl bg-[rgba(255,69,58,0.08)] px-4 py-2.5 text-[13px] font-medium text-[#FF453A] hover:bg-[rgba(255,69,58,0.15)] disabled:opacity-40"
          >
            删除
          </button>
        </div>
        {coupon.redemptionCount > 0 && (
          <p className="text-[11.5px] text-[#48484A]">
            已有 {coupon.redemptionCount} 次使用记录，删除将破坏历史关联。请改为停用。
          </p>
        )}
      </div>

      {/* 使用记录 */}
      <div className="flex flex-col gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#48484A]">
          使用记录（最近 50 条）
        </p>
        {coupon.uses.length === 0 ? (
          <p className="text-[13px] text-[#48484A]">暂无使用记录。</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl ring-1 ring-[#1A1A24]">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[#1A1A24] text-left text-[11px] uppercase tracking-[0.12em] text-[#48484A]">
                  <th className="px-4 py-3">订单 ID</th>
                  <th className="px-4 py-3">用户 ID</th>
                  <th className="px-4 py-3 text-right">抵扣</th>
                  <th className="px-4 py-3">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A24]">
                {coupon.uses.map((u) => (
                  <tr key={u.id} className="hover:bg-[#111118]">
                    <td className="px-4 py-3 font-mono text-[11px] text-[#8E8E93]">
                      {u.orderId.slice(0, 12)}…
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#48484A]">
                      {u.userId.slice(0, 12)}…
                    </td>
                    <td className="px-4 py-3 text-right text-[#30D158]">
                      -¥{(u.discount / 100).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#48484A]">
                      {new Date(u.createdAt).toLocaleString("zh-CN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDelete && (
        <ConfirmDialog
          title="删除优惠码"
          description={`确认删除 ${coupon.code}？此操作不可撤销。`}
          confirmLabel="删除"
          danger
          onClose={() => setShowDelete(false)}
          onConfirm={async () => {
            await handleDelete();
            setShowDelete(false);
          }}
        />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-[12px] text-[#8E8E93]">{label}</span>
      <span className="text-right text-[13px] text-[#F5F5F7]">{children}</span>
    </div>
  );
}
