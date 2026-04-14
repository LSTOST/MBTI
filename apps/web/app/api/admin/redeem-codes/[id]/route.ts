import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";

const patchSchema = z.object({
  maxRedemptions: z.coerce.number().int().positive().max(1_000_000).optional(),
  expiresAt: z.union([z.null(), z.coerce.date()]).optional(),
  note: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
});

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { id } = await context.params;
    const raw = (await req.json()) as unknown;
    const data = patchSchema.parse(raw);

    const existing = await prisma.redemptionCode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "不存在" }, { status: 404 });
    }

    if (data.maxRedemptions !== undefined && data.maxRedemptions < existing.redemptionCount) {
      return NextResponse.json(
        { error: `maxRedemptions 不能小于已核销次数 ${existing.redemptionCount}` },
        { status: 400 },
      );
    }

    const row = await prisma.redemptionCode.update({
      where: { id },
      data: {
        ...(data.maxRedemptions !== undefined ? { maxRedemptions: data.maxRedemptions } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
      },
    });

    return NextResponse.json({
      id: row.id,
      code: row.codeNormalized,
      note: row.note,
      maxRedemptions: row.maxRedemptions,
      redemptionCount: row.redemptionCount,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
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
    const { id } = await context.params;
    const existing = await prisma.redemptionCode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "不存在" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.redemptionUse.deleteMany({ where: { codeId: id } });
      await tx.redemptionCode.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}
