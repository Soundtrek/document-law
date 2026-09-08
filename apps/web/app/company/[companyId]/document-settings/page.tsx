import { DefinitionsList } from "../../../../components/record-definitions";
import { loadDefinitionPage } from "../../../../lib/definition-page";
export default async function Page({ params, searchParams }: { params: Promise<{ companyId: string }> ; searchParams: Promise<{ view?: string }> }) {
  const { companyId } = await params;
  const props = await loadDefinitionPage(companyId);
  return <DefinitionsList {...props} matrix={(await searchParams).view === "matrix"} />;
}
