import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

type Context = { params: Promise<{ funnelId: string }> };

const stepSchema = z.object({
  eventName: z.string().min(1),
  filters: z.record(z.string(), z.unknown()).optional(),
});

const patchSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    steps: z.array(stepSchema).min(2).max(10).optional(),
    windowHours: z.coerce.number().int().min(1).max(720).optional(),
    pinned: z.boolean().optional(),
  })
  .strict();

export async function GET(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { funnelId } = await context.params;
    const funnel = await prisma.analyticsFunnel.findUnique({ where: { id: funnelId } });
    if (!funnel) return NextResponse.json({ error: "漏斗不存在" }, { status: 404 });
    return NextResponse.json(funnel);
  } catch (error) {
    console.error("[admin/analytics/funnels/:id GET]", error);
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
    const { funnelId } = await context.params;
    const raw = (await req.json()) as unknown;
    const body = patchSchema.parse(raw);

    const funnel = await prisma.analyticsFunnel.findUnique({ where: { id: funnelId } });
    if (!funnel) return NextResponse.json({ error: "漏斗不存在" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if ("description" in body) data.description = body.description ?? null;
    if (body.steps !== undefined) data.steps = body.steps;
    if (body.windowHours !== undefined) data.windowHours = body.windowHours;
    if (body.pinned !== undefined) data.pinned = body.pinned;

    await prisma.analyticsFunnel.update({ where: { id: funnelId }, data });
    await recordAudit({
      action: "analytics.funnel.update",
      targetType: "AnalyticsFunnel",
      targetId: funnelId,
      diff: { name: funnel.name, ...data },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/analytics/funnels/:id PATCH]", error);
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
    const { funnelId } = await context.params;
    const funnel = await prisma.analyticsFunnel.findUnique({ where: { id: funnelId } });
    if (!funnel) return NextResponse.json({ error: "漏斗不存在" }, { status: 404 });

    await prisma.analyticsFunnel.delete({ where: { id: funnelId } });
    await recordAudit({
      action: "analytics.funnel.delete",
      targetType: "AnalyticsFunnel",
      targetId: funnelId,
      diff: { name: funnel.name },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/analytics/funnels/:id DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}
