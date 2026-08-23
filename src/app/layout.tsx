import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNavigation } from "@/components/BottomNavigation";
import { SettingsProvider } from "@/contexts/SettingsContext";
import KakaoInit from "@/components/KakaoInit";
import NicknameGuard from "@/components/NicknameGuard";
import Script from "next/script";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "One Verse 성경읽기",
  description: "하루 네 장, 내게 남은 한 구절",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "One Verse 성경읽기",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="bg-white dark:bg-stone-900 overscroll-none">
      <head>
        {/* Mobile Web App Optimizations - Managed by Next.js metadata/viewport */}
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 flex flex-col items-center selection:bg-amber-200 dark:selection:bg-amber-900 h-[100dvh] overflow-hidden overscroll-none">
        <KakaoInit />
        <NicknameGuard />
        <SettingsProvider>
          <AuthProvider>
            <div className="w-full max-w-2xl h-[100dvh] bg-stone-50 dark:bg-stone-950 shadow-xl flex flex-col relative border-x border-stone-200 dark:border-stone-800 overflow-hidden pt-[env(safe-area-inset-top)]">
              <main className="flex-1 w-full overflow-y-auto overscroll-y-contain pb-[calc(80px+env(safe-area-inset-bottom))] bg-stone-50 dark:bg-stone-950">
                {children}
              </main>
              <BottomNavigation />
            </div>
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
