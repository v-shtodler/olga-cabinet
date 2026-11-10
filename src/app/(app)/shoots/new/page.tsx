import { PageHead } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
export const metadata = { title: "Нова зйомка" };
export default function Page() {
  return (<><PageHead eyebrow="Розділ" title="Нова зйомка" /><AssistantInline>Цей екран переносимо з прототипу наступним кроком.</AssistantInline></>);
}
