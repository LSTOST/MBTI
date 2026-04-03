import { Prisma } from "@/generated/prisma/client";

/** 连接失败、库不存在、表未迁移等：开发环境可降级为空数据，避免整页 500 */
export function isUnavailableDatabaseError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      e.code === "P1001" ||
      e.code === "P1003" ||
      e.code === "P1017" ||
      e.code === "P2021" ||
      e.code === "P2024"
    );
  }
  return false;
}
