#!/usr/bin/env node
// Build-time launcher only. The running application never executes Git.
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
try {
  const [command, ...args] = process.argv.slice(2);
  if (!command) throw new Error("Provide the build command to run.");
  if (git("status", "--porcelain")) throw new Error("Build candidates require a clean committed checkout.");
  const branch = git("symbolic-ref", "--quiet", "--short", "HEAD");
  const sha = git("rev-parse", "HEAD");
  const channel = branch === "dev" ? "dev" : branch === "main" ? "rc" : branch.startsWith("experiment/") ? "experiment" : null;
  if (!channel) throw new Error("Build candidates require dev, main or experiment/*.");
  console.log(`Building ${channel}: ${branch} · ${sha}`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env: {
    ...process.env,
    SAMMA_BUILD_BRANCH: branch, SAMMA_BUILD_SHA: sha, SAMMA_BUILD_CHANNEL: channel,
    SAMMA_SHOW_BUILD_OVERLAY: process.env.SAMMA_SHOW_BUILD_OVERLAY ?? "true",
  } });
  if (result.error) throw new Error("Unable to launch build command.");
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Candidate build failed.");
  process.exitCode = 1;
}
