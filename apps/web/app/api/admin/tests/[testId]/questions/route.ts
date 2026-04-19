import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";

type Context = {
  params: Promise<{ testId: string }>;
};

const questionTypeSchema = z.enum(["likert_5", "single_choice", "multi_choice"]);

/**
 * 不同题型的 config 约束在应用层用 Zod 把关；DB 列仍是 Json 以保留灵活性。
 */
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
  /// 计分策略用到的数值 / 维度权重（可选）
  weight: z.number().optional(),
});

const choiceConfigSchema = z
  .object({
    options: z.array(choiceOptionSchema).min(2).max(20),
  })
  .passthrough();

const createSchema = z
  .object({
    questionKey: z
      .string()
      .min(1)
      .max(60)
      .regex(/^[A-Za-z0-9_\-]+$/, "questionKey 仅允许字母/数字/下划线/短横线"),
    type: questionTypeSchema.default("likert_5"),
    prompt: z.string().min(1).max(500),
    dimension: z.string().max(40).nullable().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    /** 不传则追加到末尾 */
    orderIndex: z.coerce.number().int().min(0).max(10_000).optional(),
  })
  .strict();

/** GET：列出某测试的全部题目，按 orderIndex 升序。 */
export async function GET(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { testId } = await context.params;

    const test = await prisma.testTemplate.findUnique({
      where: { id: testId },
      select: { id: true },
    });
    if (!test) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }

    const rows = await prisma.testQuestion.findMany({
      where: { testId },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      items: rows.map((q) => ({
        id: q.id,
        questionKey: q.questionKey,
        orderIndex: q.orderIndex,
        type: q.type,
        prompt: q.prompt,
        dimension: q.dimension,
        config: q.config,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      })),
      total: rows.length,
    });
  } catch (error) {
    console.error("[admin/tests/:id/questions GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

/** POST：新增一题。不传 orderIndex 则追加到末尾；传了则占位（不自动移动其它题，由前端 reorder 解决）。 */
export async function POST(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { testId } = await context.params;
    const raw = (await req.json()) as unknown;
    const data = createSchema.parse(raw);

    const test = await prisma.testTemplate.findUnique({
      where: { id: testId },
      select: { id: true, slug: true },
    });
    if (!test) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }

    const config = data.config ?? {};
    const configCheck = validateConfigForType(data.type, config);
    if (!configCheck.ok) {
      return NextResponse.json(
        { error: "config 字段无效", details: configCheck.errors },
        { status: 400 },
      );
    }

    // questionKey 冲突检查
    const clash = await prisma.testQuestion.findUnique({
      where: { testId_questionKey: { testId, questionKey: data.questionKey } },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json(
        { error: `questionKey "${data.questionKey}" 已存在` },
        { status: 409 },
      );
    }

    const orderIndex =
      data.orderIndex ??
      (await prisma.testQuestion.count({ where: { testId } }));

    const row = await prisma.testQuestion.create({
      data: {
        testId,
        questionKey: data.questionKey,
        orderIndex,
        type: data.type,
        prompt: data.prompt,
        dimension: data.dimension ?? null,
        config: config as never,
      },
    });

    await recordAudit({
      action: "test.question.create",
      targetType: "TestQuestion",
      targetId: row.id,
      diff: {
        testId,
        testSlug: test.slug,
        questionKey: row.questionKey,
        orderIndex: row.orderIndex,
        type: row.type,
      },
      request: req,
    });

    return NextResponse.json(
      {
        ok: true,
        item: {
          id: row.id,
          questionKey: row.questionKey,
          orderIndex: row.orderIndex,
          type: row.type,
          prompt: row.prompt,
          dimension: row.dimension,
          config: row.config,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/tests/:id/questions POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
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
