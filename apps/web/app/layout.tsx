import type { Metadata } from "next";
import { SiteHeader } from "../components/site-header";
import type { ReactNode } from "react";

import { BuildOverlay } from "../components/build-overlay";
import { builtVersion } from "../lib/built-version";

import "./globals.css";

export const metadata: Metadata = {
  title: "SAMMA",
  description: "Employment Records & Document Management",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body data-build-overlay={builtVersion.showOverlay && !!builtVersion.build ? "true" : undefined}>
        <SiteHeader />
        {children}
        <BuildOverlay snapshot={builtVersion} />
      </body>
    </html>
  );
}
