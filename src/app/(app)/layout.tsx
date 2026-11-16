import { Sidebar, MobileBar, TabBar } from "@/components/nav";
import { getSettings } from "@/lib/data";
import { Refresher } from "@/components/refresher";
import { OfflineLayer } from "@/components/offline";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const avatar = (await getSettings())?.avatar_url ?? null;
  return (
    <div className="md:flex min-h-dvh">
      <Refresher />
      <Sidebar avatar={avatar} />
      <div className="flex-1 min-w-0">
        <MobileBar avatar={avatar} />
        <div className="max-w-[1120px] mx-auto pt-2 md:pt-8 pb-28 md:pb-16" style={{ paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}>
          <OfflineLayer />
          <main>{children}</main>
        </div>
        <TabBar />
      </div>
    </div>
  );
}
