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
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
const LIGHT = "#f2f2f7", DARK = "#000000";
export async function generateViewport(): Promise<Viewport> {
  const raw = (await cookies()).get("theme")?.value;
  const themeColor = raw === "dark" ? DARK : raw === "system" ? [{ media: "(prefers-color-scheme: light)", color: LIGHT }, { media: "(prefers-color-scheme: dark)", color: DARK }] : LIGHT;
  return { themeColor, viewportFit: "cover", width: "device-width", initialScale: 1 };
}

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
