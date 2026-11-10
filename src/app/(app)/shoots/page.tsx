import { PageHead } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
export const metadata = { title: "Зйомки" };
export default function Page() {
  return (<><PageHead eyebrow="Розділ" title="Зйомки" /><AssistantInline>Цей екран переносимо з прототипу наступним кроком.</AssistantInline></>);
}
