import Link from "next/link";
import { getClients, getShoot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
import { ShootForm } from "./shoot-form";
import * as I from "@/components/icons";

export const metadata = { title: "Нова зйомка" };

export default async function NewShootPage({ searchParams }: { searchParams: Promise<{ date?: string; client?: string; dup?: string }> }) {
  const { date, client, dup } = await searchParams;
  const clients = await getClients();
  const source = dup ? (await getShoot(dup))?.shoot : null;
  return (
    <>
      <Link href="/shoots" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent mb-3"><I.Back /> Усі зйомки</Link>
      <PageHead title={source ? "Дублювати зйомку" : "Нова зйомка"} sub={source ? `На основі зйомки ${source.date}` : "Шість полів — і зйомка в календарі."} />
      <div className="flex flex-wrap gap-3.5">
        <section className="card flex-[999_1_560px] min-w-0"><ShootForm clients={clients} initial={{ date, clientId: client, source }} /></section>
        <aside className="flex-[1_1_280px] min-w-0 flex flex-col gap-3.5">
          <AssistantInline>Якщо зйомка ще не підтверджена, вона створиться як <b>Запит</b> і дата не блокує календар для помічника. Щойно домовились — натисніть «Підтвердити» у картці.</AssistantInline>
          <AssistantInline>Податковий квартал визначає дата платежу — її можна поставити вручну, коли додаєте оплату в картці зйомки.</AssistantInline>
        </aside>
      </div>
    </>
  );
}
