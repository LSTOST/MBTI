"use server";

import { revalidatePath } from "next/cache";

import { clearAllReportData } from "@/features/report/repository";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type ClearReportHistoryResult =
  | { ok: true }
  | { ok: false; message: string };

function describeClearError(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = e.meta != null ? JSON.stringify(e.meta) : "";
    return meta ? `${e.code} ${e.message} · ${meta}` : `${e.code} ${e.message}`;
  }
  if (e instanceof Error && e.message) return e.message;
  return String(e);
}

/** 返回值走 Server Action 序列化到浏览器；勿依赖抛错时的 message（常被吞） */
export async function clearReportHistoryAction(): Promise<ClearReportHistoryResult> {
  try {
    await clearAllReportData();

    /** 事务声称成功但 Report 仍有残留 → 立刻暴露，避免前端显示成功却列表依旧 */
    const remaining = await prisma.report.count();
    if (remaining > 0) {
      return { ok: false, message: `仍有 ${remaining} 条报告未被清除，请检查外键或数据库连接` };
    }

    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("[clearReportHistoryAction]", e);
    return { ok: false, message: describeClearError(e) };
  }
}
