import Link from "next/link";
import { PageHero } from "../../components/page-hero";
import { SignInForm } from "../../components/sign-in-form";
import { authErrorMessage } from "../../lib/auth-errors";
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="page-shell">
    <PageHero eyebrow="SAMMA" title="Sign in with your email" description="Continue to secure sign-in to access your SAMMA account." />
    <section className="card">
      {error ? <p className="notice warning" role="alert">{authErrorMessage(error)}</p> : null}
      {error === "OnboardingRequired" ? <p>Were you registering a company? <Link href="/onboarding/company/resume">Already registered? Continue company setup</Link></p> : null}
      <SignInForm />
      <p className="muted">Forgot your password? Continue to secure sign-in, then choose Forgot Password.</p>
      <p className="muted">New to SAMMA? <Link href="/onboarding">Create your account</Link>.</p>
      <Link href="/">Back to SAMMA</Link>
    </section>
  </main>;
}
