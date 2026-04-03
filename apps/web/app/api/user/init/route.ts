import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { Gender } from "@/generated/prisma/enums";

const COOKIE = "mbti_uid";
const MAX_AGE_SEC = 90 * 24 * 60 * 60;

/** PRD 9.10：匿名用户 HttpOnly Cookie，有效期 90 天 */
export async function POST() {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;

  if (existing) {
    const user = await prisma.user.findUnique({ where: { id: existing } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });
      const res = NextResponse.json({ userId: user.id });
      return res;
    }
  }

  const user = await prisma.user.create({
    data: {
      nickname: "星友",
      gender: Gender.unknown,
      birthDate: new Date("2000-01-01"),
    },
  });

  const res = NextResponse.json({ userId: user.id });
  res.cookies.set(COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
  return res;
}
