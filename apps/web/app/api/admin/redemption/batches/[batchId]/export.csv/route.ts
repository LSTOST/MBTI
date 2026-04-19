import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";

type Context = { params: Promise<{ batchId: string }> };

/**
 * GET /api/admin/redemption/batches/:batchId/export.csv
 * 流式导出批次内全部兑换码（CSV）。
 */
export async function GET(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { batchId } = await context.params;

    const batch = await prisma.redemptionBatch.findUnique({
      where: { id: batchId },
      select: { id: true, name: true },
    });
    if (!batch) {
      return NextResponse.json({ error: "批次不存在" }, { status: 404 });
    }

    const codes = await prisma.redemptionCode.findMany({
      where: { batchId },
      orderBy: { createdAt: "asc" },
      select: {
        codeNormalized: true,
        redemptionCount: true,
        maxRedemptions: true,
        expiresAt: true,
        active: true,
        createdAt: true,
      },
    });

    const header = "code,redemption_count,max_redemptions,expires_at,active,created_at\r\n";
    const rows = codes
      .map((c) =>
        [
          c.codeNormalized,
          c.redemptionCount,
          c.maxRedemptions,
          c.expiresAt ? c.expiresAt.toISOString() : "",
          c.active ? "1" : "0",
          c.createdAt.toISOString(),
        ].join(","),
      )
      .join("\r\n");

    const csv = header + rows;
    const safeName = batch.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "_");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.csv"`,
      },
    });
  } catch (error) {
    console.error("[admin/redemption/batches/:id/export.csv GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "导出失败" },
      { status: 500 },
    );
  }
}
