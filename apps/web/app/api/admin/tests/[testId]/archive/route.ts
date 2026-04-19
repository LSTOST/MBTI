import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

type Context = {
  params: Promise<{ testId: string }>;
};

const bodySchema = z
  .object({
    /** archive | restore —— restore 会置回 draft，便于重走发布流程 */
    action: z.enum(["archive", "restore"]).default("archive"),
  })
  .strict()
  .partial()
  .default({});

export async function POST(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { testId } = await context.params;
    let parsed: { action: "archive" | "restore" } = { action: "archive" };
    try {
      const raw = await req.json();
      const out = bodySchema.parse(raw);
      if (out.action) parsed = { action: out.action };
    } catch {
      // 允许空 body，使用默认 action
    }

    const existing = await prisma.testTemplate.findUnique({ where: { id: testId } });
    if (!existing) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }

    if (parsed.action === "archive" && existing.status === "archived") {
      return NextResponse.json({ error: "已处于归档状态" }, { status: 409 });
    }
    if (parsed.action === "restore" && existing.status !== "archived") {
      return NextResponse.json({ error: "仅归档态可恢复" }, { status: 409 });
    }

    const nextStatus = parsed.action === "archive" ? "archived" : "draft";
    const row = await prisma.testTemplate.update({
      where: { id: testId },
      data: {
        status: nextStatus,
        // 恢复为 draft 时保留 publishedAt 历史；归档不清空
      },
    });

    await recordAudit({
      action: parsed.action === "archive" ? "test.archive" : "test.restore",
      targetType: "TestTemplate",
      targetId: testId,
      diff: { from: existing.status, to: nextStatus, slug: existing.slug },
      request: req,
    });

    return NextResponse.json({ ok: true, id: row.id, status: row.status });
  } catch (error) {
    console.error("[admin/tests/:id/archive POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "归档失败" },
      { status: 500 },
    );
  }
}
