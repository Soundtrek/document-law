import { DefinitionDetail } from "../../../../../components/record-definitions";
import { loadDefinitionPage } from "../../../../../lib/definition-page";
export default async function Page({ params }: { params: Promise<{ companyId: string; definitionId: string }> }) {
  const { companyId, definitionId } = await params;
  const props = await loadDefinitionPage(companyId);
  return <DefinitionDetail {...props} definitionId={definitionId} />;
}
