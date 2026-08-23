import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNavigation } from "@/components/BottomNavigation";
import { SettingsProvider } from "@/contexts/SettingsContext";
import KakaoInit from "@/components/KakaoInit";
import NicknameGuard from "@/components/NicknameGuard";
import Script from "next/script";

export const metadata: Metadata = {
  title: "4Tracks",
  description: "깔끔하고 가독성 높은 모바일 성경 뷰어 웹앱",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Mobile Web App Optimizations */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="theme-color" content="#1c1917" />
        <meta name="format-detection" content="telephone=no" />
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen-dynamic bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center selection:bg-amber-200 dark:selection:bg-amber-900">
        <KakaoInit />
        <NicknameGuard />
        <SettingsProvider>
          <div className="flex-1 w-full max-w-2xl bg-white dark:bg-stone-900 shadow-xl flex flex-col relative border-x border-stone-200 dark:border-stone-800 pb-20 pt-[env(safe-area-inset-top)] min-h-screen">
            <main className="flex-1 w-full">
              {children}
            </main>
            <BottomNavigation />
          </div>
        </SettingsProvider>
      </body>
    </html>
  );
}
