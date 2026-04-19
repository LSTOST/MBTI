import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { assertAdminAuthorized } from "@/lib/admin-redeem-auth";
import { recordAudit } from "@/lib/admin-audit";
import { getReportStrategy } from "@/lib/test-strategy";
import { listAllTests } from "@/lib/test-loader";

/**
 * 管理后台测试模板列表。
 *
 * 查询参数（可选）：
 *   status=draft|published|archived   按状态过滤
 *   q=string                           按 name/slug/tagline 模糊搜索
 *
 * 返回：
 *   { items: LoadedTest[], total, overview: { total, published, draft, archived } }
 *
 * 注意：listAllTests() 在 DB 不可达时会 fallback 到硬编码 MBTI 两条，
 * 所以这里即便 DB 宕机也能给到一个有意义的响应。
 */
export async function GET(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status")?.trim().toLowerCase() ?? "";
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

    const all = await listAllTests();

    const filtered = all.filter((t) => {
      if (status && status !== "all" && t.status !== status) return false;
      if (q) {
        const hay = `${t.name}\n${t.slug}\n${t.tagline ?? ""}\n${t.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const overview = {
      total: all.length,
      published: all.filter((t) => t.status === "published").length,
      draft: all.filter((t) => t.status === "draft").length,
      archived: all.filter((t) => t.status === "archived").length,
    };

    return NextResponse.json({
      items: filtered.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        status: t.status,
        accessMode: t.accessMode,
        pricingMode: t.pricingMode,
        basePrice: t.basePrice,
        aiPrice: t.aiPrice,
        reportStrategy: t.reportStrategy,
        sortOrder: t.sortOrder,
        questionCount: t.questionCount,
        publishedAt: t.publishedAt?.toISOString() ?? null,
        updatedAt: t.updatedAt.toISOString(),
        source: t.source,
      })),
      total: filtered.length,
      overview,
    });
  } catch (error) {
    console.error("[admin/tests GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}

const createSchema = z
  .object({
    name: z.string().min(1).max(80),
    slug: z
      .string()
      .min(2)
      .max(60)
      .regex(/^[a-z0-9-]+$/, "slug 仅允许小写字母、数字、短横线"),
    tagline: z.string().max(200).optional(),
    reportStrategy: z.string().min(1).max(60),
    accessMode: z.enum(["public", "redeem_required"]).default("public"),
    pricingMode: z.enum(["free", "paid_unlock", "paid_entry"]).default("free"),
    basePrice: z.coerce.number().int().min(0).max(100_000_000).default(0),
    sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .strict();

/** POST：创建空测试模板（草稿）。scoringConfig 默认为空对象，后续在「计分」tab 补全。 */
export async function POST(req: Request) {
  const deny = assertAdminAuthorized(req);
  if (deny) return deny;

  try {
    const raw = (await req.json()) as unknown;
    const data = createSchema.parse(raw);

    const strategy = getReportStrategy(data.reportStrategy);
    if (!strategy) {
      return NextResponse.json(
        { error: `未注册的 reportStrategy: ${data.reportStrategy}` },
        { status: 400 },
      );
    }

    const clash = await prisma.testTemplate.findUnique({ where: { slug: data.slug } });
    if (clash) {
      return NextResponse.json({ error: "slug 已被其他测试占用" }, { status: 409 });
    }

    const row = await prisma.testTemplate.create({
      data: {
        name: data.name,
        slug: data.slug,
        tagline: data.tagline ?? null,
        reportStrategy: data.reportStrategy,
        accessMode: data.accessMode,
        pricingMode: data.pricingMode,
        basePrice: data.basePrice,
        sortOrder: data.sortOrder,
        scoringConfig: {},
      },
    });

    await recordAudit({
      action: "test.create",
      targetType: "TestTemplate",
      targetId: row.id,
      diff: { slug: row.slug, name: row.name, reportStrategy: row.reportStrategy },
      request: req,
    });

    return NextResponse.json({ ok: true, id: row.id, slug: row.slug }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: error.flatten() }, { status: 400 });
    }
    console.error("[admin/tests POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 },
    );
  }
}
