import { DefinitionDetail } from "../../../../components/record-definitions";
import { loadDefinitionPage } from "../../../../lib/definition-page";
export default async function Page({ params }: { params: Promise<{ definitionId: string }> }) {
  const { definitionId } = await params;
  const props = await loadDefinitionPage(null);
  return <DefinitionDetail {...props} definitionId={definitionId} />;
}
