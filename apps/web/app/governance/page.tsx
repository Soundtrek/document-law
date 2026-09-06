import { governanceNavigation } from "../../components/governance-users";
import { PageHero } from "../../components/page-hero";
import { requireGovernance } from "../../lib/access";
import { db } from "../../lib/database";
export default async function GovernancePage() {
  await requireGovernance(["platform.definitions.manage", "platform.roles.manage", "platform.audit.review"]);
  const definitions = await db.recordDefinitionVersion.findMany({ orderBy: [{ recordDefinitionId: "asc" }, { version: "desc" }] });
  const roles = await db.functionalRoleDefinition.findMany({ where: { active: true } });
  const activity = await db.activityEvent.findMany({ where: { OR: [{ type: { startsWith: "AUTH_" } }, { type: { startsWith: "GOVERNANCE_" } }] }, orderBy: { occurredAt: "desc" }, take: 30 });
  return <main className="page-shell"><PageHero eyebrow="SAMMA GOVERNANCE" title="Record policy and platform controls" description="Access is checked against your SAMMA Governance capabilities." nav={governanceNavigation} />
    {process.env.SAMMA_ENV === "development" && process.env.SAMMA_GOVERNANCE_MFA_REQUIRED === "false" ? <p className="notice warning">MFA is temporarily disabled for DEV/initial setup. Governance MFA must be enabled before real sensitive client data.</p> : null}
    <section className="grid"><article className="card full"><h2>Record definitions</h2>{definitions.length ? definitions.map(definition => <p key={definition.id}>{definition.name} · Version {definition.version} · {definition.classification}</p>) : <p>No record definitions configured.</p>}</article>
      <article className="card" id="roles"><h2>Functional roles</h2>{roles.length ? roles.map(role => <p key={role.id}>{role.label}</p>) : <p>No functional roles configured.</p>}</article>
      <article className="card" id="audit"><h2>Authentication and Governance activity</h2>{activity.map(event => <p key={event.id}>{event.occurredAt.toISOString()} · {event.summary}</p>)}</article>
    </section></main>;
}
