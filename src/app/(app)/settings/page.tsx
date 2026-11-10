import { PageHead } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
export const metadata = { title: "Налаштування" };
export default function Page() {
  return (<><PageHead eyebrow="Розділ" title="Налаштування" /><AssistantInline>Цей екран переносимо з прототипу наступним кроком.</AssistantInline></>);
}
