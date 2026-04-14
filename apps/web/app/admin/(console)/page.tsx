import { redirect } from "next/navigation";

export default function AdminConsoleHomePage() {
  redirect("/admin/redeem-codes");
}
