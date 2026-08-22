import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GlobalNavigation } from "@/components/GlobalNavigation";
import { SettingsProvider } from "@/contexts/SettingsContext";

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
      </head>
      <body className="min-h-screen-dynamic bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col selection:bg-amber-200 dark:selection:bg-amber-900 pt-[calc(52px+env(safe-area-inset-top))] safe-bottom">
        <SettingsProvider>
          <GlobalNavigation />
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
