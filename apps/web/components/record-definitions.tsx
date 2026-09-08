import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "./page-hero";
import { governanceNavigation } from "./governance-users";
import { DefinitionForm } from "./definition-form";
import { directionLabel, type DefinitionPolicyInput } from "../lib/definition-policy";
import type { DefinitionCatalogue, DefinitionRow } from "../lib/record-definitions";
type Props = DefinitionCatalogue & { base: string; companyId: string | null; csrf: string };
const roleCodes = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
export function DefinitionsHero({ company, base, matrix = false }: Pick<Props, "company" | "base"> & { matrix?: boolean }) {
  return <><PageHero eyebrow={company ? "COMPANY" : "SAMMA GOVERNANCE"} title={company ? "Document Settings" : "Record Definitions"} description={company ? `${company.name} · Manage document types and personnel access.` : "Configure document policy and view access across functional roles."} nav={company ? [{ href: "/company", label: "Company Info Center" }] : governanceNavigation} />
    <nav className="context-nav" aria-label="Document policy views"><Link href={base} data-active={!matrix}>Definitions</Link><Link href={`${base}?view=matrix`} data-active={matrix}>Access Matrix</Link></nav></>;
}
function DefinitionCards({ definitions, base, companyId }: Pick<Props, "definitions" | "base" | "companyId">) {
  return <div className="definition-cards">{definitions.map(d => {
    const v = d.versions[0]; if (!v) return null;
    return <article className="card" key={d.id}><div className="row"><h3><Link href={`${base}/${d.id}`}>{v.name}</Link></h3><span className="pill">{d.active && v.active ? "Active" : "Inactive"}</span></div>
      <p className="definition-code">{d.code || d.key} · v{v.version}</p><p>{v.category} · {directionLabel(v.direction)}</p><p className="muted">Person visible: {v.personVisible ? "Yes" : "No"}</p><p className="muted">Company roles: {roleCodes(v.allowedCompanyRoles).join(", ") || "None"}</p>
      {companyId && !d.companyId ? <span className="pill info">System policy</span> : null}</article>;
  })}</div>;
}
export function DefinitionsList(props: Props & { matrix: boolean }) {
  const { definitions, roles, base, companyId, matrix } = props;
  return <main className="page-shell"><DefinitionsHero {...props} /><div className="actions"><Link className="button" href={`${base}/new`}>+ {companyId ? "Add document type" : "Add definition"}</Link></div>
    {matrix ? <section className="card"><h2>Access Matrix</h2><p className="muted">Current active policies. Existing records keep the policy version used when created.</p><div className="directory-table-scroll" role="region" aria-label="Document access matrix" tabIndex={0}><table className="directory-table"><thead><tr><th scope="col">Document type</th><th scope="col">Direction</th><th scope="col">Person</th>{roles.map(role => <th key={role.id} scope="col">{role.code}</th>)}</tr></thead><tbody>{definitions.filter(d => d.active && d.versions[0]?.active).map(d => { const v = d.versions[0]!; return <tr key={d.id}><th scope="row"><Link href={`${base}/${d.id}`}>{v.name}</Link><span className="record-meta">{d.companyId ? "Company" : "System"} · v{v.version}</span></th><td>{directionLabel(v.direction)}</td><td>{v.personVisible ? "Yes" : "No"}</td>{roles.map(role => <td key={role.id}>{roleCodes(v.allowedCompanyRoles).includes(role.code) ? "Yes" : "No"}</td>)}</tr>; })}</tbody></table></div></section> : companyId ? <>
      <section><h2>Company document types</h2><DefinitionCards {...props} definitions={definitions.filter(d => d.companyId === companyId)} />{!definitions.some(d => d.companyId === companyId) ? <p className="muted">Add your first company document type.</p> : null}</section>
      <section><h2>System document types</h2><DefinitionCards {...props} definitions={definitions.filter(d => !d.companyId)} /></section></> : <DefinitionCards {...props} />}
  </main>;
}
export function DefinitionDetail(props: Props & { definitionId?: string }) {
  const definition: DefinitionRow | undefined = props.definitionId ? props.definitions.find(d => d.id === props.definitionId) : undefined;
  if (props.definitionId && !definition) notFound();
  const v = definition?.versions[0];
  const editable = !definition || definition.companyId === props.companyId;
  const initial: DefinitionPolicyInput = { code: definition?.code || definition?.key || "", name: v?.name ?? "", category: v?.category ?? "", description: v?.description ?? "",
    direction: v?.direction === "BIDIRECTIONAL" ? "COMPANY_TO_PERSON" : v?.direction ?? "COMPANY_TO_PERSON", personVisible: v?.personVisible ?? false,
    classification: v?.classification ?? "PERSONAL", roleIds: props.roles.filter(r => roleCodes(v?.allowedCompanyRoles).includes(r.code)).map(r => r.id),
    reviewMonths: v?.reviewMonths ?? null, retentionMode: v?.retentionMonths == null ? "NONE" : v.retentionMode, retentionMonths: v?.retentionMonths ?? null,
    notificationPolicy: "NONE", active: definition?.active ?? true };
  return <main className="page-shell"><DefinitionsHero {...props} /><Link href={props.base}>Back to definitions</Link><section className="card"><h2>{v?.name ?? (props.companyId ? "Add document type" : "Add definition")}</h2>
    {v ? <p className="muted">{definition!.code || definition!.key} · Current version {v.version} · {definition!.active ? "Active" : "Inactive"}</p> : null}
    {editable ? <DefinitionForm key={`${definition?.id ?? "new"}:${v?.version}:${definition?.active}`} initial={initial} {...(definition ? { definitionId: definition.id, expectedVersion: v!.version } : {})} roles={props.roles} csrf={props.csrf} companyId={props.companyId} base={props.base} /> : <p className="muted">System policy is managed by SAMMA Governance. You can create a company document type from Document Settings.</p>}
  </section>{definition ? <section className="card"><h2>Versions</h2><p className="muted">Each record remains pinned to its original version. Retention and review are separate policies.</p>{definition.versions.map(version => <details key={version.id} className="definition-version" open={version.id === v?.id}><summary>v{version.version} · {version.name} · {version.createdAt.toLocaleDateString("en-ZA")}</summary><dl className="directory-details"><dt>Direction</dt><dd>{directionLabel(version.direction)}</dd><dt>Person visible</dt><dd>{version.personVisible ? "Yes" : "No"}</dd><dt>Company roles</dt><dd>{roleCodes(version.allowedCompanyRoles).join(", ") || "None"}</dd><dt>Classification</dt><dd>{version.classification}</dd><dt>Category</dt><dd>{version.category}</dd><dt>Description</dt><dd>{version.description || "None"}</dd><dt>Review</dt><dd>{version.reviewMonths ? `${version.reviewMonths} months` : "No scheduled review"}</dd><dt>Retention</dt><dd>{version.retentionMonths ? `${version.retentionMonths} months · ${version.retentionMode === "FIXED_FROM_RELATIONSHIP_END" ? "from relationship end" : "from created"}` : "Not configured"}</dd><dt>Notifications</dt><dd>{version.notificationPolicy}</dd></dl></details>)}</section> : null}</main>;
}
