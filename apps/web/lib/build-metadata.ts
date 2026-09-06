export type BuildChannel = "dev" | "experiment" | "rc";
export type BuildMetadata = { channel: BuildChannel; branch: string; sha: string };
export type BuildSnapshot = { showOverlay: boolean; build: BuildMetadata | null };

export function buildSnapshot(env: Record<string, string | undefined>): BuildSnapshot {
  const showOverlay = env.SAMMA_SHOW_BUILD_OVERLAY === "true";
  const branch = env.SAMMA_BUILD_BRANCH;
  const sha = env.SAMMA_BUILD_SHA;
  const suppliedChannel = env.SAMMA_BUILD_CHANNEL;
  if (!branch && !sha && !suppliedChannel && !showOverlay) return { showOverlay, build: null };
  const channel = branch === "dev" ? "dev" : branch === "main" ? "rc" :
    branch?.startsWith("experiment/") ? "experiment" : null;
  // Public metadata is an explicit allowlist. Never serialize the environment.
  if (!branch || branch.length > 200 || !/^(dev|main|experiment\/[a-zA-Z0-9][a-zA-Z0-9._/-]*)$/.test(branch) ||
      !sha || !/^[a-f0-9]{40}$/.test(sha) || !channel || (suppliedChannel && suppliedChannel !== channel)) {
    throw new Error("Invalid SAMMA build metadata: provide a supported branch, full SHA and matching channel.");
  }
  return { showOverlay, build: { channel, branch, sha } };
}

export function overlayLabel(build: BuildMetadata) {
  return {
    channel: build.channel.toUpperCase(),
    branch: build.branch.replace(/^experiment\//, ""),
    sha: build.sha.slice(0, 7),
  };
}
