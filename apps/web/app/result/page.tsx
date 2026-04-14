import { notFound, redirect } from "next/navigation";

type SearchParams = Promise<{ id?: string }>;

/** 旧链接 /result?id= 统一进报告页 */
export default async function FreeResultRedirectPage({ searchParams }: { searchParams: SearchParams }) {
  const { id } = await searchParams;
  if (!id) {
    notFound();
  }
  redirect(`/report/${encodeURIComponent(id)}`);
}
