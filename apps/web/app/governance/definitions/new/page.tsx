import { DefinitionDetail } from "../../../../components/record-definitions";
import { loadDefinitionPage } from "../../../../lib/definition-page";
export default async function Page() {
  const props = await loadDefinitionPage(null);
  return <DefinitionDetail {...props} />;
}
