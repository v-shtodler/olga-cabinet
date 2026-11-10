import Link from "next/link";
import { getShoots } from "@/lib/data";
import { money, plural, todayISO } from "@/lib/domain";
import { PageHead, ShootRow } from "@/components/ui";

export const metadata = { title: "Зйомки" };

const FILTERS = [["upcoming", "Майбутні"], ["work", "В роботі"], ["owed", "Чекають оплати"], ["requests", "Запити"], ["done", "Завершені"], ["all", "Усі"]] as const;
type F = (typeof FILTERS)[number][0];

export default async function ShootsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = "upcoming", q = "" } = await searchParams;
  const filter = (FILTERS.some(([k]) => k === f) ? f : "upcoming") as F;
  const today = todayISO();
  let list = (await getShoots()).filter((s) => s.status !== "cancelled");
  if (filter === "upcoming") list = list.filter((s) => s.date >= today && s.status !== "request");
  if (filter === "work") list = list.filter((s) => s.status === "shot");
  if (filter === "owed") list = list.filter((s) => s.status === "delivered" && s.balance > 0);
  if (filter === "requests") list = list.filter((s) => s.status === "request");
  if (filter === "done") list = list.filter((s) => s.status === "paid").reverse();
  if (filter === "all") list = list.slice().reverse();
  const needle = q.trim().toLowerCase();
  if (needle) list = list.filter((s) => `${s.title} ${s.client_name} ${s.location ?? ""} ${s.no ?? ""}`.toLowerCase().includes(needle));
  const sum = list.reduce((a, s) => a + s.price, 0);

  return (
    <>
      <PageHead eyebrow={`${list.length} ${plural(list.length, "зйомка", "зйомки", "зйомок")} · ${money(sum)}`} title="Зйомки" actions={<Link href="/shoots/new" className="btn btn-primary">+ Нова зйомка</Link>} />
      <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
        <div className="seg">{FILTERS.map(([k, label]) => <Link key={k} href={`/shoots?f=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={k === filter ? "on" : ""}>{label}</Link>)}</div>
        <form className="field flex-1 min-w-[200px]" action="/shoots" method="get">
          <input type="hidden" name="f" value={filter} />
          <label htmlFor="q" className="sr-only">Пошук</label>
          <input id="q" name="q" type="search" placeholder="Пошук: клієнт, назва, локація, №" defaultValue={q} />
        </form>
      </div>
      <section className="card"><div className="flex flex-col gap-2">{list.length ? list.map((s) => <ShootRow key={s.id} s={s} rel />) : <div className="empty">Нічого не знайдено.</div>}</div></section>
    </>
  );
}
