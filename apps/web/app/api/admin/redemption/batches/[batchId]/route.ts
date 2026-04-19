import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

type Context = { params: Promise<{ batchId: string }> };

/**
 * GET /api/admin/redemption/batches/:batchId
 * 批次详情 + 分页码列表。
 */
export async function GET(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { batchId } = await context.params;
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = 50;

    const batch = await prisma.redemptionBatch.findUnique({
      where: { id: batchId },
      include: {
        test: { select: { id: true, name: true, slug: true } },
        _count: { select: { codes: true } },
      },
    });
    if (!batch) {
      return NextResponse.json({ error: "批次不存在" }, { status: 404 });
    }

    const [codes, usedAgg] = await Promise.all([
      prisma.redemptionCode.findMany({
        where: { batchId },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          codeNormalized: true,
          redemptionCount: true,
          maxRedemptions: true,
          expiresAt: true,
          active: true,
          createdAt: true,
        },
      }),
      prisma.redemptionCode.aggregate({
        where: { batchId },
        _sum: { redemptionCount: true },
      }),
    ]);

    const total = batch._count.codes;
    const usedCount = usedAgg._sum.redemptionCount ?? 0;

    return NextResponse.json({
      id: batch.id,
      name: batch.name,
      testId: batch.testId,
      test: batch.test,
      note: batch.note,
      codeCount: total,
      usedCount,
      createdAt: batch.createdAt.toISOString(),
      codes: {
        items: codes.map((c) => ({
          id: c.id,
          code: c.codeNormalized,
          redemptionCount: c.redemptionCount,
          maxRedemptions: c.maxRedemptions,
          expiresAt: c.expiresAt?.toISOString() ?? null,
          active: c.active,
          createdAt: c.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error("[admin/redemption/batches/:id GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/redemption/batches/:batchId
 * 停用批次（批量将全部 active=false）或延长有效期。
 */
export async function PATCH(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { batchId } = await context.params;
    const body = (await req.json()) as { deactivate?: boolean; expiresAt?: string | null };

    const batch = await prisma.redemptionBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return NextResponse.json({ error: "批次不存在" }, { status: 404 });
    }

    if (body.deactivate) {
      await prisma.redemptionCode.updateMany({
        where: { batchId, active: true },
        data: { active: false },
      });
      await recordAudit({
        action: "redemption.batch.deactivate",
        targetType: "RedemptionBatch",
        targetId: batchId,
        diff: { name: batch.name },
        request: req,
      });
      return NextResponse.json({ ok: true, action: "deactivated" });
    }

    if ("expiresAt" in body) {
      const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      await prisma.redemptionCode.updateMany({
        where: { batchId },
        data: { expiresAt },
      });
      await recordAudit({
        action: "redemption.batch.update_expires",
        targetType: "RedemptionBatch",
        targetId: batchId,
        diff: { name: batch.name, expiresAt: body.expiresAt ?? null },
        request: req,
      });
      return NextResponse.json({ ok: true, action: "expires_updated" });
    }

    return NextResponse.json({ error: "未提供有效操作" }, { status: 400 });
  } catch (error) {
    console.error("[admin/redemption/batches/:id PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 },
    );
  }
}
