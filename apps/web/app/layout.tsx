import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "SAMMA",
  description: "Employment Records & Document Management",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link className="brand" href="/">
              <strong>SAMMA</strong>
              <span>Employment Records & Document Management</span>
            </Link>
            <nav aria-label="Development navigation" className="top-nav">
              <Link href="/sign-in">Sign in</Link>
              <Link href="/person">Person</Link>
              <Link href="/company">Company</Link>
              <Link href="/legal-access">Legal Access</Link>
              <Link href="/governance">Governance</Link>
              <span className="dev-ribbon">Synthetic dev data</span>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
