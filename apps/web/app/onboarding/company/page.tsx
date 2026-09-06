import Link from "next/link";
import { cookies } from "next/headers";
import { requireSession } from "../../../lib/access";
import { authSettings } from "../../../lib/auth";
import { db } from "../../../lib/database";
import { readOnboarding, setupCookieName } from "../../../lib/onboarding-state";
import { CompanyOnboardingForm } from "../../../components/company-onboarding-form";
import { redirect } from "next/navigation";

export default async function CompanyOnboardingPage() {
  const session = await requireSession();
  const state = readOnboarding((await cookies()).get(setupCookieName)?.value, authSettings().secret, "company");
  if (!state || state.accountId !== session.accountId || state.identityId !== session.identityId) {
    return <main className="landing-shell"><section className="card"><h1>Start your company setup</h1>
      <p className="muted">Choose Company from Create account to begin or restart your setup.</p><Link href="/onboarding">Create account</Link><Link href="/person">Personal Info Center</Link>
    </section></main>;
  }
  if (await db.companyMember.findFirst({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } } })) redirect("/company");
  return <main className="landing-shell"><section className="landing-card">
    <h1>Create your company workspace</h1><p className="muted">Enter your company name to get started.</p>
    <CompanyOnboardingForm /><p className="muted"><Link href="/person">Set up later</Link></p>
  </section></main>;
}
