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
    /** 按新顺序给出的题目 id 列表；必须覆盖该测试下的全部题目。 */
    order: z.array(z.string().min(1)).min(1).max(1000),
  })
  .strict();

/**
 * POST：批量重排序。
 *
 * 严格校验 order 恰好覆盖当前测试下的全部题目，避免出现题被遗漏或外部 id 混入。
 * 事务内把 orderIndex 逐条改写，`[testId, orderIndex]` 是非唯一索引，中途重复也不会冲突。
 */
export async function POST(req: Request, context: Context) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const { testId } = await context.params;
    const raw = (await req.json()) as unknown;
    const { order } = bodySchema.parse(raw);

    const test = await prisma.testTemplate.findUnique({
      where: { id: testId },
      select: { id: true, slug: true },
    });
    if (!test) {
      return NextResponse.json({ error: "测试不存在" }, { status: 404 });
    }

    const current = await prisma.testQuestion.findMany({
      where: { testId },
      select: { id: true, orderIndex: true },
    });

    const currentIds = new Set(current.map((q) => q.id));
    const requestedIds = new Set(order);

    if (requestedIds.size !== order.length) {
      return NextResponse.json({ error: "order 列表中存在重复 id" }, { status: 400 });
    }
    if (requestedIds.size !== currentIds.size) {
      return NextResponse.json(
        {
          error: `order 必须覆盖全部 ${currentIds.size} 道题目，当前 ${requestedIds.size}`,
        },
        { status: 400 },
      );
    }
    for (const id of order) {
      if (!currentIds.has(id)) {
        return NextResponse.json(
          { error: `id ${id} 不属于该测试` },
          { status: 400 },
        );
      }
    }

    // 旧顺序用于审计 diff
    const beforeMap = new Map(current.map((q) => [q.id, q.orderIndex]));

    await prisma.$transaction(
      order.map((id, idx) =>
        prisma.testQuestion.update({
          where: { id },
          data: { orderIndex: idx },
        }),
      ),
    );

    const changedCount = order.reduce((n, id, idx) => (beforeMap.get(id) === idx ? n : n + 1), 0);

    await recordAudit({
      action: "test.question.reorder",
      targetType: "TestTemplate",
      targetId: testId,
      diff: {
        testSlug: test.slug,
        total: order.length,
        changed: changedCount,
      },
      request: req,
    });

    return NextResponse.json({ ok: true, total: order.length, changed: changedCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/tests/:id/questions/reorder POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "排序失败" },
      { status: 500 },
    );
  }
}
