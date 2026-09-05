import { requireSession } from "../../../lib/access";
import { PageHero } from "../../../components/page-hero";
import { WorkflowForm } from "../../../components/workflow-form";
export default async function NewCompanyPage() {
  await requireSession();
  return <main className="page-shell"><PageHero eyebrow="COMPANY" title="Create company" description="You will become its initial Company Owner." /><section className="card"><WorkflowForm values={{ operation: "create-company" }} fields={[{ name: "name", label: "Company name" }]} label="Create company" /><p className="muted">Owners manage Team &amp; Access. Assign yourself an approved functional role there when you need to work with records.</p></section></main>;
}
