import Link from "next/link";
import { OnboardingChoices } from "../components/onboarding-choices";
export default function HomePage() {
  return <main className="landing-page">
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-hero-copy">
        <p className="eyebrow">SAMMA</p>
        <h1 id="landing-title">Your employment documents,<br />available when you need them.</h1>
        <p className="landing-hero-description">SAMMA connects people and companies through the employment documents they share.</p>
        <div className="landing-actions">
          <Link className="button" href="#account-types">Create an account</Link>
          <Link className="button secondary" href="/sign-in">Sign in</Link>
        </div>
      </div>
      <div className="landing-hero-note" aria-label="SAMMA product context">
        <strong>Employment Records &amp; Document Management</strong>
        <span>One clear place for the records connected to your working relationships.</span>
      </div>
    </section>
    <section className="landing-account-section" id="account-types" aria-labelledby="account-types-title">
      <div className="landing-section-heading">
        <p className="eyebrow">Start with SAMMA</p>
        <h2 id="account-types-title">For people and companies</h2>
        <p>Choose the account that matches your role in the employment relationship.</p>
      </div>
      <OnboardingChoices />
    </section>
    <section className="landing-section" aria-labelledby="how-it-works-title">
      <div className="landing-section-heading">
        <p className="eyebrow">How SAMMA works</p>
        <h2 id="how-it-works-title">A direct connection between people, companies and records.</h2>
        <p>Employment relationships connect people, companies and their records.</p>
      </div>
      <figure className="landing-relationship-diagram" aria-label="People and companies connect through documents">
        <div className="landing-diagram-node">PERSON</div>
        <div className="landing-diagram-connector" aria-hidden="true">↔</div>
        <div className="landing-diagram-node">COMPANY</div>
        <div className="landing-diagram-documents"><span aria-hidden="true">│</span><strong>DOCUMENTS</strong></div>
      </figure>
    </section>
    <section className="landing-section" aria-labelledby="documents-title">
      <div className="landing-section-heading">
        <p className="eyebrow">Shared records</p>
        <h2 id="documents-title">The documents that support employment.</h2>
      </div>
      <ul className="landing-document-grid">
        <li>Payslips</li>
        <li>Employment contracts</li>
        <li>Company policies</li>
        <li>Employment records</li>
      </ul>
    </section>
    <section className="landing-trust" aria-labelledby="access-title">
      <div>
        <p className="eyebrow">Built around the relationship</p>
        <h2 id="access-title">Controlled access</h2>
      </div>
      <p>People and companies see the employment records that relate to them. Access follows the relationship, the document context and the permissions granted for that work.</p>
    </section>
    <section className="landing-final-cta" aria-labelledby="final-cta-title">
      <p className="eyebrow">Ready when you are</p>
      <h2 id="final-cta-title">Create your SAMMA account</h2>
      <p>Start as a Person or Company and keep your employment documents connected.</p>
      <div className="landing-actions"><Link className="button" href="#account-types">Create an account</Link><Link className="button secondary" href="/sign-in">Sign in</Link></div>
    </section>
    <footer className="landing-footer"><span>SAMMA · Employment Records &amp; Document Management</span><Link href="/sign-in">Sign in</Link></footer>
  </main>;
}
