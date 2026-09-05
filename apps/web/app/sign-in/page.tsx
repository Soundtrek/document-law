import Link from "next/link";

import { PageHero } from "../../components/page-hero";
import { SignInForm } from "../../components/sign-in-form";

export default function SignInPage() {
  return (
    <main className="page-shell">
      <PageHero
        eyebrow="IDENTITY"
        title="Sign in with your email"
        description="Email is the primary human-facing login identifier. SAMMA keeps a stable internal Account ID so email changes and future linked providers do not create duplicate people or relationships."
      />
      <section className="grid">
        <article className="card">
          <SignInForm />
        </article>
        <article className="card">
          <p className="eyebrow">Security Model</p>
          <h2>Authentication and authorisation stay separate</h2>
          <p className="muted">The identity provider proves who you are. SAMMA then resolves Person, company membership, functional roles, Legal Access and Governance capabilities for that stable account.</p>
          <p className="notice">SAMMA application code never needs to implement password cryptography.</p>
          <div className="actions"><Link className="button secondary" href="/">Back to SAMMA</Link></div>
        </article>
      </section>
    </main>
  );
}
