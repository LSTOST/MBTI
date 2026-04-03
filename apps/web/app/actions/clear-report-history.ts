"use server";

import { revalidatePath } from "next/cache";

import { clearAllReportData } from "@/features/report/repository";

export async function clearReportHistoryAction() {
  await clearAllReportData();
  revalidatePath("/");
}
