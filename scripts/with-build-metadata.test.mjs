import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("candidate launcher captures its own clean revision and rejects misleading builds", () => {
  const root = mkdtempSync(join(tmpdir(), "samma-build-test-"));
  const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  try {
    mkdirSync(join(root, "scripts"));
    copyFileSync(new URL("./with-build-metadata.mjs", import.meta.url), join(root, "scripts/with-build-metadata.mjs"));
    git("init", "--initial-branch=dev");
    git("config", "user.name", "Synthetic Build Test"); git("config", "user.email", "build@example.invalid");
    git("add", "."); git("commit", "-m", "synthetic build fixture");
    const run = (env = {}) => spawnSync(process.execPath, [join(root, "scripts/with-build-metadata.mjs"), process.execPath, "-e", 'console.log(JSON.stringify({branch:process.env.SAMMA_BUILD_BRANCH,sha:process.env.SAMMA_BUILD_SHA,channel:process.env.SAMMA_BUILD_CHANNEL,show:process.env.SAMMA_SHOW_BUILD_OVERLAY}))'], { encoding: "utf8", env: { ...process.env, ...env } });
    for (const [branch, channel] of [["dev", "dev"], ["experiment/test", "experiment"], ["main", "rc"]]) {
      if (branch !== "dev") git("switch", "-c", branch);
      const result = run({ SAMMA_BUILD_BRANCH: "stale", SAMMA_BUILD_SHA: "stale", SAMMA_BUILD_CHANNEL: "stale", SAMMA_SHOW_BUILD_OVERLAY: "true" });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout.trim().split("\n").at(-1)), { branch, channel, sha: git("rev-parse", "HEAD"), show: "true" });
    }
    assert.equal(JSON.parse(run({ SAMMA_SHOW_BUILD_OVERLAY: "false" }).stdout.trim().split("\n").at(-1)).show, "false");
    writeFileSync(join(root, "uncommitted.txt"), "synthetic change");
    assert.notEqual(run().status, 0);
    rmSync(join(root, "uncommitted.txt"));
    git("switch", "--detach"); assert.notEqual(run().status, 0);
    git("switch", "-c", "unsupported"); assert.notEqual(run().status, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
