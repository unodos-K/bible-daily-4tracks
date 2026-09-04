import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";
import KakaoInit from "@/components/KakaoInit";
import NicknameGuard from "@/components/NicknameGuard";
import MainLayout from "@/components/MainLayout";
import Script from "next/script";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "One Verse 성경읽기",
  description: "하루 네 장, 내게 남은 한 구절",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/icons/icon-192x192.png",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="bg-stone-50 dark:bg-stone-950">
      <head>
        <meta name="theme-color" content="#0c0a09" data-app-theme-color="true" />
        <Script id="apply-initial-theme" strategy="beforeInteractive">{`
          try {
            const savedTheme = localStorage.getItem("bible_app_theme");
            const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches) || (savedTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
            document.documentElement.classList.toggle("dark", isDark);
            document.querySelector('meta[data-app-theme-color="true"]')?.setAttribute("content", isDark ? "#0c0a09" : "#fafaf9");
          } catch (_) {}
        `}</Script>
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 selection:bg-amber-200 dark:selection:bg-amber-900">
        <KakaoInit />
        <AuthProvider>
          <NicknameGuard />
          <SettingsProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
