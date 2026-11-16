import Link from "next/link";
import { notFound } from "next/navigation";
import { getClients, getPresets, getShoot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
import { ShootForm } from "../../new/shoot-form";
import * as I from "@/components/icons";

export const metadata = { title: "Редагувати зйомку" };

export default async function EditShootPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [clients, presets, data] = await Promise.all([getClients(), getPresets(), getShoot(id)]);
  if (!data) notFound();
  const s = data.shoot;
  return (
    <>
      <Link href={`/shoots/${id}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent mb-3"><I.Back /> До зйомки</Link>
      <PageHead title="Редагувати зйомку" sub={`«${s.title}» · № ${s.no}`} />
      <div className="flex flex-wrap gap-3.5">
        <section className="card flex-[999_1_560px] min-w-0"><ShootForm clients={clients} presets={presets} initial={{ source: s }} editId={id} /></section>
        <aside className="flex-[1_1_280px] min-w-0 flex flex-col gap-3.5">
          <AssistantInline>Статус, платежі, замітки й чек-лист не змінюються — тут лише умови: дата, час, ціна, кількість фото, строки.</AssistantInline>
          {s.status === "shot" && <AssistantInline>Зміна «віддачі, днів» перерахує дедлайн від дати зйомки.</AssistantInline>}
        </aside>
      </div>
    </>
  );
}
