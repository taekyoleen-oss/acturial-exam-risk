import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
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
        <footer className="mt-16 border-t border-[#E2E8F0] bg-[#F8FAFC] py-8 text-center">
          <p className="text-sm text-[#64748B] mb-2">더 많은 앱을 활용하거나 만들고 싶으면</p>
          <a
            href="https://www.vibecodinglab.ai.kr/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0891B2] hover:text-[#0E7490] transition-colors"
          >
            🚀 바이브코딩랩 방문하기
          </a>
          <p className="text-xs text-[#94A3B8] mt-1">vibecodinglab.ai.kr</p>
        </footer>
      </body>
    </html>
  );
}
