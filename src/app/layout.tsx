import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Кабінет", template: "%s · Кабінет" },
  description: "Приватний кабінет фотографа",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Кабінет" },
};
export const viewport: Viewport = { themeColor: "#f2f3f5", viewportFit: "cover", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={inter.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
