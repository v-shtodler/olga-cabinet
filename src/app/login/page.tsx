import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вхід" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-7">
        <div className="flex items-center gap-3 mb-6">
          <span aria-hidden="true" className="w-8 h-8 rounded-[10px]" style={{ background: "linear-gradient(135deg,#ff7a59,#ffb36b)", boxShadow: "0 4px 12px rgba(255,122,89,.4)" }} />
          <div>
            <div className="font-bold tracking-tight">Olga Voychik</div>
            <div className="text-xs text-muted">Приватний кабінет</div>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tighter mb-1">Вхід</h1>
        <p className="text-muted text-[13px] mb-5">Тільки для власниці кабінету. Сторонніх акаунтів тут немає.</p>
        {error === "link" && <p className="text-warn text-[13px] mb-3">Посилання застаріло або вже використане. Запитайте нове.</p>}
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
