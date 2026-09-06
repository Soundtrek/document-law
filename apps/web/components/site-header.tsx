import Link from "next/link";
import { LogoutButton } from "./auth-controls";
import { navigationAccess } from "../lib/access";

export async function SiteHeader() {
  const { signedIn, company, governance, governanceHref, legal, companySetup } = await navigationAccess();
  return <header className="site-header" data-public={!signedIn}><div className="site-header-inner">
    <Link className="brand" href="/" aria-label="SAMMA home"><strong>SAMMA</strong><span>Employment Records &amp; Document Management</span></Link>
    {signedIn ? <nav aria-label="SAMMA navigation" className="top-nav">
      {companySetup ? <Link href="/onboarding/company">Complete company setup</Link> : <Link href="/person">Personal Info Center</Link>}
      {company ? <Link href="/company">Company Info Center</Link> : null}
      {legal ? <Link href="/legal-access">Legal Access</Link> : null}
      {governance ? <Link href={governanceHref}>Governance</Link> : null}
      <LogoutButton />
    </nav> : null}
  </div></header>;
}
