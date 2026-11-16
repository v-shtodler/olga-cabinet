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
      {/* Apple sign-in sheet: big app mark, title, short caption, then the fields */}
      <div className="card w-full max-w-[360px] p-7 text-center">
        <span aria-hidden="true" className="w-16 h-16 rounded-[14px] mx-auto mb-4 flex items-center justify-center text-[20px] font-bold text-white" style={{ background: "linear-gradient(135deg,#0a84ff,#5e5ce6)" }}>OV</span>
        <h1 className="text-[22px] font-bold tracking-[-0.01em] mb-1">Кабінет Olga Voychik</h1>
        <p className="text-muted text-[14px] mb-6">Приватний простір для зйомок, оплат і податків.</p>
        {error === "link" && <p className="text-[13px] mb-3" style={{ color: "var(--warn)" }}>Посилання застаріло або вже використане. Запитайте нове.</p>}
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
