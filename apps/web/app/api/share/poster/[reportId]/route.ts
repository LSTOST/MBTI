import { NextResponse } from "next/server";

/** PRD：服务端 @vercel/og + 对象存储占位；当前以客户端 html-to-image 为主 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "服务端海报未启用。请使用分享页的「保存海报」导出；接入 S3/R2 与 Satori 后可在此返回 CDN URL。",
      code: "POSTER_SERVER_DISABLED",
    },
    { status: 501 },
  );
}
