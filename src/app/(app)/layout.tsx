import { TopNav, BottomNav } from "@/components/nav";
import { Refresher } from "@/components/refresher";
import { OfflineLayer } from "@/components/offline";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[1180px] mx-auto pt-4 pb-28 md:pb-16" style={{ paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}>
      <Refresher />
      <TopNav />
      <OfflineLayer />
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
