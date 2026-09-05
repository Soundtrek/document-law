import { LandingSignInForm } from "../components/landing-sign-in-form";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="landing-intro" aria-labelledby="landing-title">
        <h1 id="landing-title">SAMMA</h1>
        <p className="landing-descriptor">Employment Records &amp; Document Management</p>
        <p className="landing-summary">Keep your employment records securely organised and connected to the companies you work with.</p>
      </section>

      <section className="landing-card" aria-labelledby="sign-in-title">
        <h2 id="sign-in-title">Sign in to SAMMA</h2>
        <LandingSignInForm />
        <p className="landing-account-copy">
          <strong>New to SAMMA?</strong>
          <span>Your account is created when you first verify your email.</span>
        </p>
      </section>

      <footer className="landing-footer" aria-label="Information">
        <span role="link" aria-disabled="true">Privacy</span>
        <span role="link" aria-disabled="true">Terms</span>
        <span role="link" aria-disabled="true">Help</span>
      </footer>
    </main>
  );
}
