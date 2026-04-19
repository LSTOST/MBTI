import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

type Context = { params: Promise<{ eventId: string }> };

const patchSchema = z
  .object({
    displayName: z.string().min(1).max(100).optional(),
    category: z.string().min(1).max(50).optional(),
    description: z.string().max(500).nullable().optional(),
    properties: z.array(z.unknown()).optional(),
    status: z.enum(["active", "deprecated"]).optional(),
  })
  .strict();

export async function PATCH(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { eventId } = await context.params;
    const raw = (await req.json()) as unknown;
    const body = patchSchema.parse(raw);

    const event = await prisma.trackedEvent.findUnique({ where: { id: eventId } });
    if (!event) return NextResponse.json({ error: "事件不存在" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.displayName !== undefined) data.displayName = body.displayName;
    if (body.category !== undefined) data.category = body.category;
    if ("description" in body) data.description = body.description ?? null;
    if (body.properties !== undefined) data.properties = body.properties;
    if (body.status !== undefined) data.status = body.status;

    await prisma.trackedEvent.update({ where: { id: eventId }, data });
    await recordAudit({
      action: "analytics.event.update",
      targetType: "TrackedEvent",
      targetId: eventId,
      diff: { name: event.name, ...data },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/analytics/events/:id PATCH]", error);
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
    const { eventId } = await context.params;
    const event = await prisma.trackedEvent.findUnique({ where: { id: eventId } });
    if (!event) return NextResponse.json({ error: "事件不存在" }, { status: 404 });

    await prisma.trackedEvent.delete({ where: { id: eventId } });
    await recordAudit({
      action: "analytics.event.delete",
      targetType: "TrackedEvent",
      targetId: eventId,
      diff: { name: event.name },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/analytics/events/:id DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}
