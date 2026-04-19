import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";

/**
 * GET /api/admin/audit
 * 审计日志列表，支持 action/targetType/from/to/page 筛选。
 */
export async function GET(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? undefined;
    const targetType = url.searchParams.get("targetType") ?? undefined;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = 50;

    const where = {
      ...(action ? { action: { contains: action } } : {}),
      ...(targetType ? { targetType } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        actor: r.actor,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        diff: r.diff,
        ip: r.ip,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[admin/audit GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}
