import type { Metadata, Viewport } from "next";
import "./globals.css";

import { ToastProvider } from "@/components/ui/toast";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.fullName} — ${BRAND.taglineJa}`,
    template: `%s | ${BRAND.fullName}`,
  },
  description: BRAND.descriptionJa,
  applicationName: BRAND.fullName,
  authors: [{ name: BRAND.company.nameJa }],
  keywords: [
    "AI 採用",
    "人材紹介",
    "医療福祉",
    "看護師",
    "介護職",
    "AI 適職診断",
    "AI 面接",
    "FAX 営業",
    BRAND.fullName,
  ],
  openGraph: {
    title: `${BRAND.fullName} — ${BRAND.taglineJa}`,
    description: BRAND.descriptionJa,
    siteName: BRAND.fullName,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.fullName,
    description: BRAND.taglineJa,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1E3A5F" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1422" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          メインコンテンツへスキップ
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
