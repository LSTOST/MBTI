import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

type Context = { params: Promise<{ couponId: string }> };

const patchSchema = z
  .object({
    active: z.boolean().optional(),
    maxRedemptions: z.coerce.number().int().min(1).nullable().optional(),
    perUserLimit: z.coerce.number().int().min(1).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    note: z.string().max(500).nullable().optional(),
    value: z.coerce.number().int().min(1).max(10_000_000).optional(),
    minAmount: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export async function GET(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { couponId } = await context.params;
    const row = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        test: { select: { id: true, name: true, slug: true } },
        uses: {
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            orderId: true,
            userId: true,
            discount: true,
            createdAt: true,
          },
        },
      },
    });
    if (!row) {
      return NextResponse.json({ error: "优惠码不存在" }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      code: row.codeNormalized,
      type: row.type,
      value: row.value,
      scope: row.scope,
      testId: row.testId,
      test: row.test,
      minAmount: row.minAmount,
      maxRedemptions: row.maxRedemptions,
      redemptionCount: row.redemptionCount,
      perUserLimit: row.perUserLimit,
      startsAt: row.startsAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      active: row.active,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      uses: row.uses.map((u) => ({
        id: u.id,
        orderId: u.orderId,
        userId: u.userId,
        discount: u.discount,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[admin/coupons/:id GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { couponId } = await context.params;
    const raw = (await req.json()) as unknown;
    const data = patchSchema.parse(raw);

    const existing = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!existing) {
      return NextResponse.json({ error: "优惠码不存在" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.active !== undefined) updateData.active = data.active;
    if (data.maxRedemptions !== undefined) updateData.maxRedemptions = data.maxRedemptions;
    if (data.perUserLimit !== undefined) updateData.perUserLimit = data.perUserLimit;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.minAmount !== undefined) updateData.minAmount = data.minAmount;

    const row = await prisma.coupon.update({
      where: { id: couponId },
      data: updateData,
    });

    await recordAudit({
      action: "coupon.update",
      targetType: "Coupon",
      targetId: couponId,
      diff: { code: existing.codeNormalized, changes: Object.keys(updateData) },
      request: req,
    });

    return NextResponse.json({ ok: true, id: row.id, updatedAt: row.updatedAt.toISOString() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/coupons/:id PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { couponId } = await context.params;
    const existing = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: { _count: { select: { uses: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "优惠码不存在" }, { status: 404 });
    }
    if (existing._count.uses > 0) {
      return NextResponse.json(
        { error: `已有 ${existing._count.uses} 次使用记录，无法删除。请改为停用（active=false）。` },
        { status: 409 },
      );
    }

    // Explicitly nullify Order.couponId before deleting, in case the DB-level
    // onDelete: SetNull FK was not applied (e.g., migration not run in prod).
    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({ where: { couponId }, data: { couponId: null } });
      await tx.coupon.delete({ where: { id: couponId } });
    });

    await recordAudit({
      action: "coupon.delete",
      targetType: "Coupon",
      targetId: couponId,
      diff: { code: existing.codeNormalized },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/coupons/:id DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}
