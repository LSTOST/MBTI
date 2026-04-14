import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s · 运营后台",
    default: "运营后台",
  },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
