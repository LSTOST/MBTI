import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

const stepSchema = z.object({
  eventName: z.string().min(1),
  filters: z.record(z.string(), z.unknown()).optional(),
});

const createSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    steps: z.array(stepSchema).min(2).max(10),
    windowHours: z.coerce.number().int().min(1).max(720).default(24),
    pinned: z.boolean().default(false),
  })
  .strict();

/**
 * GET /api/admin/analytics/funnels
 */
export async function GET(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const funnels = await prisma.analyticsFunnel.findMany({
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json({ items: funnels, total: funnels.length });
  } catch (error) {
    console.error("[admin/analytics/funnels GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/analytics/funnels
 */
export async function POST(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const raw = (await req.json()) as unknown;
    const data = createSchema.parse(raw);

    const funnel = await prisma.analyticsFunnel.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        steps: data.steps as never,
        windowHours: data.windowHours,
        pinned: data.pinned,
      },
    });

    await recordAudit({
      action: "analytics.funnel.create",
      targetType: "AnalyticsFunnel",
      targetId: funnel.id,
      diff: { name: funnel.name, steps: data.steps.length },
      request: req,
    });

    return NextResponse.json({ ok: true, id: funnel.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/analytics/funnels POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 },
    );
  }
}
