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
    <html lang="ko" className="bg-stone-50 dark:bg-stone-950 overscroll-none">
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
      <body className="bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col items-center selection:bg-amber-200 dark:selection:bg-amber-900 h-[100dvh] overflow-hidden overscroll-none">
        <KakaoInit />
        <NicknameGuard />
        <SettingsProvider>
          <div className="w-full max-w-2xl h-[100dvh] bg-stone-50 dark:bg-stone-950 shadow-xl flex flex-col relative border-x border-stone-200 dark:border-stone-800 overflow-hidden pt-[env(safe-area-inset-top)]">
            <main className="flex-1 w-full overflow-y-auto overscroll-y-contain pb-[calc(80px+env(safe-area-inset-bottom))]">
              {children}
            </main>
            <BottomNavigation />
          </div>
        </SettingsProvider>
      </body>
    </html>
  );
}
