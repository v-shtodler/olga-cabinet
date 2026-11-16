import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { LoginCleanup } from "./cleanup";

export const metadata = { title: "Вхід" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10">
      <LoginCleanup />
      <div className="card w-full max-w-sm p-7">
        <div className="flex items-center gap-3 mb-6">
          <span aria-hidden="true" className="w-8 h-8 rounded-[10px]" style={{ background: "linear-gradient(135deg,#0a84ff,#5e5ce6)" }} />
          <div>
            <div className="font-bold tracking-tight">Olga Voychik</div>
            <div className="text-[13px] text-muted">Приватний кабінет</div>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-[-0.01em] mb-1">Вхід</h1>
        <p className="text-muted text-[13px] mb-5">Тільки для власниці кабінету. Сторонніх акаунтів тут немає.</p>
        {error === "link" && <p className="text-warn text-[13px] mb-3">Посилання застаріло або вже використане. Запитайте нове.</p>}
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
