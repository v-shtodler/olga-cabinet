"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const supabase = createClient();
    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMsg("Неправильна пошта або пароль."); setBusy(false); return; }
      router.replace(next); router.refresh();
    } else {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: false } });
      setMsg(error ? "Не вдалося надіслати лист. Перевірте пошту." : "Лист із посиланням для входу надіслано.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="field flex flex-col gap-1.5">
        <label htmlFor="email">Пошта</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {mode === "password" && (
        <div className="field flex flex-col gap-1.5">
          <label htmlFor="password">Пароль</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      )}
      {msg && <p className="text-[13px] text-muted">{msg}</p>}
      <button className="btn btn-primary mt-1" type="submit" disabled={busy}>
        {busy ? "Хвилинку…" : mode === "password" ? "Увійти" : "Надіслати посилання"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm self-center" onClick={() => { setMode(mode === "password" ? "magic" : "password"); setMsg(null); }}>
        {mode === "password" ? "Увійти посиланням на пошту" : "Увійти з паролем"}
      </button>
    </form>
  );
}
