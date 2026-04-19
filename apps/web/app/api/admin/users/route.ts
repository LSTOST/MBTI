import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";

/**
 * GET /api/admin/users
 * 用户列表，支持 q（nickname/id）搜索，分页。
 */
export async function GET(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = 30;

    const where = q
      ? {
          OR: [
            { nickname: { contains: q } },
            { id: { contains: q } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          nickname: true,
          gender: true,
          createdAt: true,
          _count: { select: { reports: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      items: rows.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        gender: u.gender,
        reportCount: u._count.reports,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[admin/users GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}
