import type { Metadata } from "next";
import { SiteHeader } from "../components/site-header";
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
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
