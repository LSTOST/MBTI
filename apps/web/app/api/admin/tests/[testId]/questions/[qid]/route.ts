import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

type Context = {
  params: Promise<{ testId: string; qid: string }>;
};

const questionTypeSchema = z.enum(["likert_5", "single_choice", "multi_choice"]);

const likertConfigSchema = z
  .object({
    leftPole: z.string().max(20).optional(),
    rightPole: z.string().max(20).optional(),
    leftLabel: z.string().max(40).optional(),
    rightLabel: z.string().max(40).optional(),
    facet: z.string().max(40).optional(),
  })
  .passthrough();

const choiceOptionSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(200),
  weight: z.number().optional(),
});

const choiceConfigSchema = z
  .object({
    options: z.array(choiceOptionSchema).min(2).max(20),
  })
  .passthrough();

const patchSchema = z
  .object({
    questionKey: z
      .string()
      .min(1)
      .max(60)
      .regex(/^[A-Za-z0-9_\-]+$/, "questionKey 仅允许字母/数字/下划线/短横线")
      .optional(),
    type: questionTypeSchema.optional(),
    prompt: z.string().min(1).max(500).optional(),
    dimension: z.string().max(40).nullable().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    orderIndex: z.coerce.number().int().min(0).max(10_000).optional(),
  })
  .strict();

/** PATCH：更新题目字段。type 变更会连带要求 config 重新通过校验。 */
export async function PATCH(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { testId, qid } = await context.params;
    const raw = (await req.json()) as unknown;
    const data = patchSchema.parse(raw);

    const existing = await prisma.testQuestion.findUnique({ where: { id: qid } });
    if (!existing || existing.testId !== testId) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    // questionKey 唯一性
    if (data.questionKey && data.questionKey !== existing.questionKey) {
      const clash = await prisma.testQuestion.findUnique({
        where: { testId_questionKey: { testId, questionKey: data.questionKey } },
        select: { id: true },
      });
      if (clash && clash.id !== qid) {
        return NextResponse.json(
          { error: `questionKey "${data.questionKey}" 已存在` },
          { status: 409 },
        );
      }
    }

    // type / config 任一变化都要重跑对应 schema 校验
    const nextType = data.type ?? existing.type;
    const nextConfig =
      data.config !== undefined
        ? data.config
        : ((existing.config as Record<string, unknown>) ?? {});
    if (data.type !== undefined || data.config !== undefined) {
      const check = validateConfigForType(nextType, nextConfig);
      if (!check.ok) {
        return NextResponse.json(
          { error: "config 字段无效", details: check.errors },
          { status: 400 },
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.questionKey !== undefined) updateData.questionKey = data.questionKey;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.prompt !== undefined) updateData.prompt = data.prompt;
    if (data.dimension !== undefined) updateData.dimension = data.dimension;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.config !== undefined) updateData.config = data.config as never;

    const row = await prisma.testQuestion.update({
      where: { id: qid },
      data: updateData,
    });

    await recordAudit({
      action: "test.question.update",
      targetType: "TestQuestion",
      targetId: qid,
      diff: {
        testId,
        before: {
          questionKey: existing.questionKey,
          type: existing.type,
          orderIndex: existing.orderIndex,
          dimension: existing.dimension,
        },
        after: {
          questionKey: row.questionKey,
          type: row.type,
          orderIndex: row.orderIndex,
          dimension: row.dimension,
        },
      },
      request: req,
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: row.id,
        questionKey: row.questionKey,
        orderIndex: row.orderIndex,
        type: row.type,
        prompt: row.prompt,
        dimension: row.dimension,
        config: row.config,
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/tests/:id/questions/:qid PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 },
    );
  }
}

/** DELETE：删除题目。无关联校验——删题不影响历史报告，仅影响未来答题。 */
export async function DELETE(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { testId, qid } = await context.params;

    const existing = await prisma.testQuestion.findUnique({ where: { id: qid } });
    if (!existing || existing.testId !== testId) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    await prisma.testQuestion.delete({ where: { id: qid } });

    await recordAudit({
      action: "test.question.delete",
      targetType: "TestQuestion",
      targetId: qid,
      diff: {
        testId,
        questionKey: existing.questionKey,
        orderIndex: existing.orderIndex,
        type: existing.type,
      },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/tests/:id/questions/:qid DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}

function validateConfigForType(
  type: "likert_5" | "single_choice" | "multi_choice",
  config: Record<string, unknown>,
): { ok: true } | { ok: false; errors: string[] } {
  if (type === "likert_5") {
    const parsed = likertConfigSchema.safeParse(config);
    if (!parsed.success) {
      return {
        ok: false,
        errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      };
    }
    return { ok: true };
  }
  const parsed = choiceConfigSchema.safeParse(config);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  return { ok: true };
}
