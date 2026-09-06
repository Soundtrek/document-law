import { cookies } from "next/headers";
import { requireSession } from "../../../lib/access";
import { authSettings } from "../../../lib/auth";
import { db } from "../../../lib/database";
import { readOnboarding, setupCookieName } from "../../../lib/onboarding-state";
import { CompanyOnboardingForm } from "../../../components/company-onboarding-form";
import { redirect } from "next/navigation";
import { OnboardingChoices } from "../../../components/onboarding-choices";

export default async function CompanyOnboardingPage() {
  const session = await requireSession();
  if (await db.companyMember.findFirst({ where: { accountId: session.accountId, status: "ACTIVE", company: { status: "ACTIVE" } } })) redirect("/company");
  const state = readOnboarding((await cookies()).get(setupCookieName)?.value, authSettings().secret, "company");
  if (!state || state.accountId !== session.accountId || state.identityId !== session.identityId) {
    return <main className="landing-shell"><section className="card"><h1>Start your company setup</h1>
      <p className="muted">Your company setup needs to be restarted. Continue below to create your workspace.</p><OnboardingChoices companyOnly />
    </section></main>;
  }
  return <main className="landing-shell"><section className="landing-card">
    <h1>Create your company workspace</h1><p className="muted">Enter your company name to get started.</p>
    <CompanyOnboardingForm />
  </section></main>;
}
