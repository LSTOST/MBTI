import type { Metadata } from "next";

import { RedeemCodesConsole } from "@/features/admin/redeem-codes-console";

export const metadata: Metadata = {
  title: "兑换码",
};

export default function AdminRedeemCodesPage() {
  return <RedeemCodesConsole />;
}
