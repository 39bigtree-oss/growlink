import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "グロウリンク AI採用・営業自動化システム",
  description: "求職者の申込から AI 適職診断・面接・FAX 送信票生成までを一気通貫で行う社内システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
