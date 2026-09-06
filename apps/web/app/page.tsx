import { OnboardingChoices } from "../components/onboarding-choices";
export default function HomePage() {
  return <main className="landing-shell onboarding-shell">
    <section className="landing-intro" aria-labelledby="landing-title">
      <h1 id="landing-title">SAMMA</h1>
      <p className="landing-descriptor">Employment Records &amp; Document Management</p>
    </section>
    <OnboardingChoices />
  </main>;
}
