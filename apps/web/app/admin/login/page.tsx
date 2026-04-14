import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/features/admin/admin-login-form";
import { ADMIN_SESSION_COOKIE, getAdminRedeemSecret, verifyAdminSessionToken } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "登录",
};

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const secret = getAdminRedeemSecret();
  if (secret) {
    const jar = await cookies();
    const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
    if (token && verifyAdminSessionToken(token, secret)) {
      redirect("/admin/redeem-codes");
    }
  }
  return <AdminLoginForm configError={sp.reason === "config"} />;
}
