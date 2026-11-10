import { PageHead } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
export const metadata = { title: "Аналітика" };
export default function Page() {
  return (<><PageHead eyebrow="Розділ" title="Аналітика" /><AssistantInline>Цей екран переносимо з прототипу наступним кроком.</AssistantInline></>);
}
