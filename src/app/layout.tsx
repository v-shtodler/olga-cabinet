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
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#eef1fa" }, { media: "(prefers-color-scheme: dark)", color: "#111527" }], viewportFit: "cover", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const raw = (await cookies()).get("theme")?.value;
  const theme: Theme = THEMES.includes(raw as Theme) ? (raw as Theme) : "light";
  return (
    <html lang="uk" className={inter.variable} data-theme={theme}>
      <body>
        <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute rounded-full blur-[90px] w-[520px] h-[520px] -top-40 -left-36" style={{ background: "var(--blob-1)", opacity: "var(--blob-opacity)" }} />
          <div className="absolute rounded-full blur-[90px] w-[600px] h-[600px] top-36 -right-52" style={{ background: "var(--blob-2)", opacity: "var(--blob-opacity)" }} />
          <div className="absolute rounded-full blur-[90px] w-[520px] h-[520px] -bottom-32 left-1/4" style={{ background: "var(--blob-3)", opacity: "calc(var(--blob-opacity) * 0.85)" }} />
        </div>
        {children}
      </body>
    </html>
  );
}
