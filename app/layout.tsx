import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "대한민국 국내공항 통합 FIDS",
  description: "인천·대구를 시작으로 확장하는 국내공항 통합 실시간 운항정보 전광판",
  applicationName: "Korea Airport FIDS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "공항 FIDS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07111f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
