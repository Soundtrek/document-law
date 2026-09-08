import { DefinitionsList } from "../../../components/record-definitions";
import { loadDefinitionPage } from "../../../lib/definition-page";
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const props = await loadDefinitionPage(null);
  return <DefinitionsList {...props} matrix={(await searchParams).view === "matrix"} />;
}
