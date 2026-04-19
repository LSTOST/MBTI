import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";

/**
 * GET /api/admin/reports
 * 报告列表，支持 testId/status/q/page 筛选。
 */
export async function GET(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const url = new URL(req.url);
    const testId = url.searchParams.get("testId") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const q = url.searchParams.get("q") ?? undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = 30;

    const where = {
      ...(testId ? { testId } : {}),
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { nickname: { contains: q } },
              { mbtiType: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          nickname: true,
          mbtiType: true,
          status: true,
          isPremiumLocked: true,
          testId: true,
          test: { select: { name: true } },
          createdAt: true,
        },
      }),
      prisma.report.count({ where }),
    ]);

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        nickname: r.nickname,
        mbtiType: r.mbtiType,
        status: r.status,
        isPremiumLocked: r.isPremiumLocked,
        testName: r.test?.name ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[admin/reports GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}
