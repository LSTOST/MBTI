/** PRD 9.8：轮询间隔 1s，默认最多 30s */
export async function pollPaymentOrderPaid(
  orderId: string,
  options?: { intervalMs?: number; maxMs?: number },
): Promise<boolean> {
  const intervalMs = options?.intervalMs ?? 1000;
  const maxMs = options?.maxMs ?? 30000;
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`/api/payment/status/${orderId}`);
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, intervalMs));
        continue;
      }
      const data = (await res.json()) as { status?: string };
      if (data.status === "paid") {
        return true;
      }
    } catch {
      /* 网络抖动继续轮询 */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return false;
}
