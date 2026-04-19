import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

const createSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z_][a-z0-9_]*$/, "事件名仅允许小写字母、数字、下划线，需以字母/下划线开头"),
    displayName: z.string().min(1).max(100),
    category: z.string().min(1).max(50),
    description: z.string().max(500).optional(),
    properties: z.array(z.unknown()).default([]),
  })
  .strict();

/**
 * GET /api/admin/analytics/events
 * 事件注册表列表。
 */
export async function GET(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") ?? undefined;
    const status = url.searchParams.get("status") as "active" | "deprecated" | null;

    const events = await prisma.trackedEvent.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ items: events, total: events.length });
  } catch (error) {
    console.error("[admin/analytics/events GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/analytics/events
 * 注册新事件。
 */
export async function POST(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const raw = (await req.json()) as unknown;
    const data = createSchema.parse(raw);

    const existing = await prisma.trackedEvent.findUnique({ where: { name: data.name } });
    if (existing) {
      return NextResponse.json({ error: "事件名已存在" }, { status: 409 });
    }

    const event = await prisma.trackedEvent.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        category: data.category,
        description: data.description ?? null,
        properties: data.properties as never,
      },
    });

    await recordAudit({
      action: "analytics.event.create",
      targetType: "TrackedEvent",
      targetId: event.id,
      diff: { name: event.name, category: event.category },
      request: req,
    });

    return NextResponse.json({ ok: true, id: event.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/analytics/events POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 },
    );
  }
}
