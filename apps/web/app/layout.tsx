import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC } from "next/font/google";

import { UserSessionInit } from "@/components/user-session-init";
import "./globals.css";

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MBTI × 星座灵魂伴侣",
  description: "MBTI × 星座：测出你的灵魂伴侣，看最容易对谁心动、又适合和谁走得久远。",
  openGraph: {
    title: "测测你的 MBTI 灵魂伴侣",
    description: "你最容易对谁心动？又适合和谁走得久远？来测一测。",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0A0A0F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${notoSansSC.variable} font-sans antialiased bg-[#0A0A0F] text-[#F5F5F7]`}
      >
        <UserSessionInit />
        {children}
      </body>
    </html>
  );
}
