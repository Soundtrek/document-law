"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const isPublic = usePathname() === "/";

  return (
    <header className="site-header" data-public={isPublic}>
      <div className="site-header-inner">
        <Link className="brand" href="/" aria-label="SAMMA home">
          <strong>SAMMA</strong>
          <span>Employment Records &amp; Document Management</span>
        </Link>
        {!isPublic ? (
          <nav aria-label="Development navigation" className="top-nav">
            <Link href="/sign-in">Sign in</Link>
            <Link href="/person">Person</Link>
            <Link href="/company">Company</Link>
            <Link href="/legal-access">Legal Access</Link>
            <Link href="/governance">Governance</Link>
            <span className="dev-ribbon">Synthetic dev data</span>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
