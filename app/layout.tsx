import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "USDT DApp",
  description: "Simple USDT Transfer DApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 提前检测钱包，在页面加载时就触发
              (function() {
                console.log('[Wallet Detector] Script loaded');
                console.log('[Wallet Detector] window.ethereum:', typeof window.ethereum);

                // 监听 DOMContentLoaded 事件
                document.addEventListener('DOMContentLoaded', function() {
                  console.log('[Wallet Detector] DOMContentLoaded');
                  console.log('[Wallet Detector] window.ethereum:', typeof window.ethereum);
                });

                // 监听 OKX 特定的事件
                window.addEventListener('okxwallet#initialized', function() {
                  console.log('[Wallet Detector] OKX Wallet initialized');
                });
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
