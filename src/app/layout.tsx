import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

export type Theme = "light" | "dark" | "system";
export const THEMES: Theme[] = ["light", "dark", "system"];

const inter = Inter({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Кабінет", template: "%s · Кабінет" },
  description: "Приватний кабінет фотографа",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Кабінет" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f2f3f5" }, { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" }], viewportFit: "cover", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const raw = (await cookies()).get("theme")?.value;
  const theme: Theme = THEMES.includes(raw as Theme) ? (raw as Theme) : "light";
  return (
    <html lang="uk" className={inter.variable} data-theme={theme}>
      <body>
        {children}
      </body>
    </html>
  );
}
