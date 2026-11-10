import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Кабінет", template: "%s · Кабінет" },
  description: "Приватний кабінет фотографа",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Кабінет" },
};
export const viewport: Viewport = { themeColor: "#eef2fa", viewportFit: "cover", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>
        <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute rounded-full blur-[90px] opacity-90 w-[520px] h-[520px] -top-40 -left-36" style={{ background: "var(--blob-1)" }} />
          <div className="absolute rounded-full blur-[90px] opacity-90 w-[600px] h-[600px] top-36 -right-52" style={{ background: "var(--blob-2)" }} />
          <div className="absolute rounded-full blur-[90px] opacity-80 w-[520px] h-[520px] -bottom-32 left-1/4" style={{ background: "var(--blob-3)" }} />
        </div>
        {children}
      </body>
    </html>
  );
}
