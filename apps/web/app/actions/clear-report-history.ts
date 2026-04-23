"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { clearUserReportData } from "@/features/report/repository";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

const USER_COOKIE = "mbti_uid";

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

/**
 * 只清当前匿名用户（mbti_uid cookie）名下的历史。
 * 绝不清其他用户、不清后台发行的兑换码/优惠券。
 * 返回值走 Server Action 序列化到浏览器；勿依赖抛错时的 message（常被吞）。
 */
export async function clearReportHistoryAction(): Promise<ClearReportHistoryResult> {
  try {
    const jar = await cookies();
    const userId = jar.get(USER_COOKIE)?.value;
    if (!userId) {
      return { ok: true };
    }

    await clearUserReportData(userId);

    /** 事务声称成功但当前用户 Report 仍有残留 → 立刻暴露 */
    const remaining = await prisma.report.count({ where: { userId } });
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
