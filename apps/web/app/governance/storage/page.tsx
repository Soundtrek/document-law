import { cookies } from "next/headers";
import { StorageConfigurationPanel } from "../../../components/storage-configuration";
import { requireGovernance } from "../../../lib/access";
import { authSettings, sessionCookieName } from "../../../lib/auth";
import { db } from "../../../lib/database";
import { storageConfigurationOverview } from "../../../lib/storage-configuration";
import { storageConfigurationCsrf } from "../../../lib/storage-configuration-security";

export default async function GovernanceStoragePage() {
  await requireGovernance(["platform.system.configure"]);
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token) throw new Error("Session unavailable");
  const overview = await storageConfigurationOverview(db);
  return <StorageConfigurationPanel overview={overview} csrf={storageConfigurationCsrf(authSettings().secret, token)} />;
}
