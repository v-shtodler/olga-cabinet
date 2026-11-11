import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card max-w-md mx-auto mt-10 p-7 text-center">
      <div className="text-4xl mb-3" aria-hidden="true">🔍</div>
      <h1 className="text-2xl font-extrabold tracking-tighter mb-1">Такого запису немає</h1>
      <p className="text-muted text-[13px] mb-5">Зйомку або замовника видалено, або посилання застаріло.</p>
      <div className="flex gap-2 justify-center"><Link href="/shoots" className="btn btn-primary">До зйомок</Link><Link href="/" className="btn">На головну</Link></div>
    </div>
  );
}
