import { PageHead } from "@/components/ui";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PageHead eyebrow="Замовник" title={id.slice(0, 8)} />; }
