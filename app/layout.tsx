import type { Metadata } from "next";
import { Baloo_2, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "ClassQ",
  description: "초등학교 교육용 Q&A 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${baloo.variable} ${notoSansKr.variable} min-h-screen bg-[#F0F4FF] text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
