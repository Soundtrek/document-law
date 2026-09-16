import Link from "next/link";
import { LogoutButton } from "./auth-controls";
import { SiteNavLink } from "./site-nav-link";
import { navigationAccess } from "../lib/access";

export async function SiteHeader() {
  const { signedIn, company, governance, governanceHref, legal, companySetup } = await navigationAccess();
  return <header className="site-header" data-public={!signedIn}><div className="site-header-inner">
    <Link className="brand" href="/" aria-label="SAMMA home"><strong>SAMMA</strong><span>Employment Records &amp; Document Management</span></Link>
    {signedIn ? <nav aria-label="SAMMA navigation" className="top-nav">
      {companySetup ? <SiteNavLink href="/onboarding/company">Complete company setup</SiteNavLink> : <SiteNavLink href="/person">Personal Info Center</SiteNavLink>}
      {company ? <SiteNavLink href="/company">Company Info Center</SiteNavLink> : null}
      {legal ? <SiteNavLink href="/legal-access">Legal Access</SiteNavLink> : null}
      {governance ? <SiteNavLink href={governanceHref}>Governance</SiteNavLink> : null}
      <LogoutButton />
    </nav> : <nav aria-label="Public navigation" className="top-nav public-nav"><SiteNavLink href="/sign-in">Sign in</SiteNavLink></nav>}
  </div></header>;
}
