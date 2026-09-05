"use client";

import Link from "next/link";
import { LogoutButton } from "./auth-controls";
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
          <nav aria-label="SAMMA navigation" className="top-nav">
            <Link href="/sign-in">Sign in</Link>
            <Link href="/person">Person</Link>
            <Link href="/company">Company</Link>
            <Link href="/legal-access">Legal Access</Link>
            <Link href="/governance">Governance</Link>
            <LogoutButton />
          </nav>
        ) : null}
      </div>
    </header>
  );
}
