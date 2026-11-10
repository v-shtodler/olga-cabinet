import { PageHead } from "@/components/ui";
import { getShoot } from "@/lib/data";
import { notFound } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const data = await getShoot(id); if (!data) notFound();
  return <PageHead eyebrow={data.shoot.client_name} title={data.shoot.title} />;
}
