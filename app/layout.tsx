import type { Metadata } from "next";
import "./globals.css";
import { AccessKeyBanner } from "@/components/ui/AccessKeyBanner";

export const metadata: Metadata = {
  title: "계리리스크관리 학습 참고",
  description: "보험계리사 2차 계리리스크관리 — 주간 뉴스 기반 가상 문제 및 기출문제 참고 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <AccessKeyBanner />
        {children}
      </body>
    </html>
  );
}
