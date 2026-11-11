import Link from "next/link";

export const metadata = { title: "Офлайн" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-7 text-center">
        <div className="text-4xl mb-3" aria-hidden="true">📵</div>
        <h1 className="text-2xl font-extrabold tracking-tighter mb-1">Немає інтернету</h1>
        <p className="text-muted text-[13px] mb-5">Цей екран ще не відкривався з мережею, тож його копії на телефоні немає. Екрани, які ви вже бачили, відкриваються і офлайн; зміни збережуться в чергу й відправляться самі.</p>
        <Link href="/" className="btn btn-primary">На головну</Link>
      </div>
    </main>
  );
}
