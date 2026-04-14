export type UnlockMode = "redeem" | "payment";

/** 客户端 / 服务端均可读；未设置或非 payment 时默认兑换码解锁 */
export function getPublicUnlockMode(): UnlockMode {
  const v = process.env.NEXT_PUBLIC_UNLOCK_MODE?.trim().toLowerCase();
  return v === "payment" ? "payment" : "redeem";
}
