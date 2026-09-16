"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function matchesPath(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function SiteNavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const current = matchesPath(pathname, href);
  return <Link href={href} aria-current={current ? "page" : undefined} data-current={current ? "true" : undefined}>{children}</Link>;
}
