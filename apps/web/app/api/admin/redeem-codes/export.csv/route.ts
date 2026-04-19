import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";

export async function GET(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const codes = await prisma.redemptionCode.findMany({
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

    return new NextResponse(header + rows, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="redeem-codes.csv"`,
      },
    });
  } catch (error) {
    console.error("[admin/redeem-codes/export.csv GET]", error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}
