import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminConsoleShell } from "@/features/admin/admin-console-shell";
import { ADMIN_SESSION_COOKIE, getAdminRedeemSecret, verifyAdminSessionToken } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const secret = getAdminRedeemSecret();
  if (!secret) {
    redirect("/admin/login?reason=config");
  }

  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !verifyAdminSessionToken(token, secret)) {
    redirect("/admin/login");
  }

  return <AdminConsoleShell>{children}</AdminConsoleShell>;
}
