import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Juanity Law",
  description: "Secure document knowledge system for employment and legal records.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link className="brand" href="/">
              <strong>Juanity Law</strong>
              <span>Document Knowledge System</span>
            </Link>
            <nav aria-label="Development navigation" className="top-nav">
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
