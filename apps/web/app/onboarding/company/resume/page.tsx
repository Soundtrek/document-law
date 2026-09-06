import { CompanyRegistrationResume } from "../../../../components/company-registration-resume";

export default function CompanyRegistrationResumePage() {
  return <main className="landing-shell"><section className="card">
    <h1>Continue your Company setup</h1>
    <p>Already registered for Company setup, or told your email already exists? Sign in with your registered account to continue. You will enter your company name after signing in.</p>
    <CompanyRegistrationResume />
  </section></main>;
}
