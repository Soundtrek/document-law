import Link from "next/link";
import { PageHero } from "../../components/page-hero";
import { SignInForm } from "../../components/sign-in-form";
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="page-shell">
    <PageHero eyebrow="SAMMA" title="Sign in with your email" description="Continue to secure sign-in to access your SAMMA account." />
    <section className="card">
      {error ? <p className="notice warning" role="alert">Sign-in could not be completed. Check your account access and try again.</p> : null}
      <SignInForm />
      <p className="muted">New to SAMMA? <Link href="/onboarding">Create your account</Link>.</p>
      <Link href="/">Back to SAMMA</Link>
    </section>
  </main>;
}
