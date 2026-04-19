import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

type Context = { params: Promise<{ codeId: string }> };

const patchSchema = z
  .object({
    active: z.boolean().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    maxRedemptions: z.coerce.number().int().min(1).optional(),
  })
  .strict();

/**
 * PATCH /api/admin/redemption/codes/:codeId
 * 单码更新（启用/停用、改有效期、改最大核销数）。
 */
export async function PATCH(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { codeId } = await context.params;
    const raw = (await req.json()) as unknown;
    const body = patchSchema.parse(raw);

    const code = await prisma.redemptionCode.findUnique({ where: { id: codeId } });
    if (!code) {
      return NextResponse.json({ error: "码不存在" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.active === "boolean") data.active = body.active;
    if ("expiresAt" in body) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.maxRedemptions !== undefined) data.maxRedemptions = body.maxRedemptions;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "未提供有效字段" }, { status: 400 });
    }

    await prisma.redemptionCode.update({ where: { id: codeId }, data });
    await recordAudit({
      action: "redemption.code.update",
      targetType: "RedemptionCode",
      targetId: codeId,
      diff: { code: code.codeNormalized, ...data },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/redemption/codes/:id PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/redemption/codes/:codeId
 * 删除单码（已使用的不允许删除）。
 */
export async function DELETE(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { codeId } = await context.params;

    const code = await prisma.redemptionCode.findUnique({ where: { id: codeId } });
    if (!code) {
      return NextResponse.json({ error: "码不存在" }, { status: 404 });
    }
    if (code.redemptionCount > 0) {
      return NextResponse.json({ error: "该码已被使用，不允许删除" }, { status: 409 });
    }

    await prisma.redemptionCode.delete({ where: { id: codeId } });
    await recordAudit({
      action: "redemption.code.delete",
      targetType: "RedemptionCode",
      targetId: codeId,
      diff: { code: code.codeNormalized },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/redemption/codes/:id DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}
