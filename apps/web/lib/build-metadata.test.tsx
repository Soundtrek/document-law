import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BuildOverlay } from "../components/build-overlay";
import { buildSnapshot } from "./build-metadata";

const sha = "67c2a8973a6ec0dfb437944176f8da4878fb4a58";
for (const [branch, channel, label] of [["dev", "dev", "DEV"], ["experiment/onboarding-person-company", "experiment", "EXPERIMENT"], ["main", "rc", "RC"]]) {
  test(`${label} renders the built branch and short SHA`, () => {
    const snapshot = buildSnapshot({ SAMMA_BUILD_BRANCH: branch, SAMMA_BUILD_CHANNEL: channel, SAMMA_BUILD_SHA: sha, SAMMA_SHOW_BUILD_OVERLAY: "true" });
    const markup = renderToStaticMarkup(<BuildOverlay snapshot={snapshot} />);
    assert.ok(markup.includes(label!));
    assert.ok(markup.includes(branch!.replace(/^experiment\//, "")));
    assert.ok(markup.includes("67c2a89"));
    assert.ok(!markup.includes(sha));
    assert.equal(snapshot.build?.sha, sha);
  });
}
test("visibility requires the literal true flag, independent of NODE_ENV", () => {
  for (const flag of [undefined, "false", "TRUE", "1"]) {
    const snapshot = buildSnapshot({ SAMMA_BUILD_BRANCH: "dev", SAMMA_BUILD_SHA: sha, SAMMA_SHOW_BUILD_OVERLAY: flag, NODE_ENV: "development" });
    assert.equal(renderToStaticMarkup(<BuildOverlay snapshot={snapshot} />), "");
  }
  assert.equal(buildSnapshot({ NODE_ENV: "production", SAMMA_BUILD_BRANCH: "dev", SAMMA_BUILD_SHA: sha, SAMMA_SHOW_BUILD_OVERLAY: "true" }).showOverlay, true);
  assert.deepEqual(buildSnapshot({}), { showOverlay: false, build: null });
});
test("invalid, incomplete and conflicting metadata is rejected without echoing values", () => {
  for (const input of [
    {}, { SAMMA_BUILD_BRANCH: "dev" }, { SAMMA_BUILD_BRANCH: "dev", SAMMA_BUILD_SHA: "67c2a89" },
    { SAMMA_BUILD_BRANCH: "dev", SAMMA_BUILD_SHA: sha, SAMMA_BUILD_CHANNEL: "rc" },
    { SAMMA_BUILD_BRANCH: "https://secret.example/repo", SAMMA_BUILD_SHA: sha },
    { SAMMA_BUILD_BRANCH: "/private/path", SAMMA_BUILD_SHA: sha },
    { SAMMA_BUILD_BRANCH: "experiment/", SAMMA_BUILD_SHA: sha },
  ]) assert.throws(() => buildSnapshot({ ...input, SAMMA_SHOW_BUILD_OVERLAY: "true" }), /^Error: Invalid SAMMA build metadata:/);
});
test("only explicitly public fields enter the snapshot", () => {
  const snapshot = buildSnapshot({ SAMMA_BUILD_BRANCH: "dev", SAMMA_BUILD_SHA: sha, SAMMA_SHOW_BUILD_OVERLAY: "true", AUTH_SECRET: "synthetic-canary", DATABASE_URL: "synthetic-private-db", SAMMA_COMPILED_BUILD: "untrusted override", HOSTNAME: "synthetic-host" });
  assert.deepEqual(snapshot, { showOverlay: true, build: { branch: "dev", sha, channel: "dev" } });
  assert.ok(!JSON.stringify(snapshot).includes("synthetic"));
});
