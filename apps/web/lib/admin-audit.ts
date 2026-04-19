import { prisma } from "@/lib/db";

/** 审计动作命名规范：`{domain}.{verb}`，例：test.publish / coupon.delete / redemption.batch.create */
export type AuditAction = string;

export type AuditEntry = {
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  /** 变更摘要（before/after，或 payload）。注意不要塞整个大 JSON。 */
  diff?: unknown;
  /** 暂用固定 "admin"；RBAC 上线后填用户 id */
  actor?: string;
  /** 可选的调用 Request，用来抽 IP/UA。 */
  request?: Request;
};

/** 从 Request 抽 IP（兼容常见反向代理头）。失败返回 null 不阻塞。 */
function extractIp(req?: Request): string | null {
  if (!req) return null;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? null;
}

/** 写一条审计日志；失败只打 console，不抛，避免拖累主流程。 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actor: entry.actor ?? "admin",
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        diff: (entry.diff ?? null) as never,
        ip: extractIp(entry.request),
      },
    });
  } catch (err) {
    console.error("[admin-audit] failed to record", entry.action, err);
  }
}
