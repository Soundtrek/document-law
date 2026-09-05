import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { checkAudit, parseAuditProcess } from "./check-production-audit.mjs";

const report = JSON.parse(readFileSync(new URL("./fixtures/prisma-audit.json", import.meta.url), "utf8"));
const currentLock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const approvedNames = ["prisma", "@prisma/client", "@prisma/adapter-pg", "@prisma/config", "deepmerge-ts", "mysql2"];
function fixture() {
  return {
    audit: structuredClone(report),
    lock: structuredClone(currentLock),
    installed: Object.fromEntries(approvedNames.map(name => [`node_modules/${name}`, { name, version: currentLock.packages[`node_modules/${name}`].version }])),
    environment: "development",
  };
}
function recount(audit) {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  for (const finding of Object.values(audit.vulnerabilities)) { counts[finding.severity]++; counts.total++; }
  audit.metadata.vulnerabilities = counts;
}
function addFinding(audit, severity) {
  audit.vulnerabilities["synthetic-unrelated"] = {
    name: "synthetic-unrelated", severity, isDirect: false,
    nodes: ["node_modules/synthetic-unrelated"], effects: [],
    via: [{ name: "synthetic-unrelated", dependency: "synthetic-unrelated", severity, url: "https://github.com/advisories/GHSA-0000-0000-0000" }],
  };
  recount(audit);
}

test("current recorded production audit passes with exactly three approved advisory IDs", () => {
  assert.deepEqual(checkAudit(fixture()), {
    exception: true,
    advisoryIds: ["GHSA-ggr8-5vv4-36mx", "GHSA-3f6p-5ww8-9rcr", "GHSA-rgwj-5xj2-c3m3"],
  });
});
test("a new high finding fails alongside the known exception", () => {
  const input = fixture(); addFinding(input.audit, "high");
  assert.throws(() => checkAudit(input), /Unknown high/);
});
test("a new critical finding is never excepted", () => {
  const input = fixture(); addFinding(input.audit, "critical");
  assert.throws(() => checkAudit(input), /Critical/);
});
test("an approved advisory upgraded to critical is never excepted", () => {
  const input = fixture(); input.audit.vulnerabilities.mysql2.via[0].severity = "critical";
  assert.throws(() => checkAudit(input), /Critical/);
});
test("a new high advisory inside an approved package fails", () => {
  const input = fixture();
  input.audit.vulnerabilities.mysql2.via.push({ ...input.audit.vulnerabilities.mysql2.via[0], url: "https://github.com/advisories/GHSA-0000-0000-0000" });
  assert.throws(() => checkAudit(input), /Unapproved advisory set/);
});
test("replacing a known advisory with another ID fails", () => {
  const input = fixture(); input.audit.vulnerabilities.mysql2.via[0].url = "https://github.com/advisories/GHSA-0000-0000-0000";
  assert.throws(() => checkAudit(input), /Unapproved advisory set/);
});
test("the exception cannot silently lose its known moderate advisory", () => {
  const input = fixture(); input.audit.vulnerabilities.mysql2.via.pop();
  assert.throws(() => checkAudit(input), /Unapproved advisory set/);
});
test("duplicate approved advisories do not widen the exception", () => {
  const input = fixture(); input.audit.vulnerabilities.mysql2.via.push(input.audit.vulnerabilities.mysql2.via[0]);
  assert.throws(() => checkAudit(input), /Unapproved advisory set/);
});
for (const name of approvedNames) {
  test(`locked version drift fails for ${name}`, () => {
    const input = fixture(); input.lock.packages[`node_modules/${name}`].version = "99.0.0";
    assert.throws(() => checkAudit(input), /Unapproved locked version/);
  });
  test(`installed version drift fails for ${name}`, () => {
    const input = fixture(); input.installed[`node_modules/${name}`].version = "99.0.0";
    assert.throws(() => checkAudit(input), /Unapproved installed version/);
  });
}
test("an additional nested vulnerable package location fails", () => {
  const input = fixture(); input.lock.packages["node_modules/other/node_modules/mysql2"] = { version: "3.15.3" };
  assert.throws(() => checkAudit(input), /Unexpected installation paths/);
});
test("changed Prisma dependency edge fails", () => {
  const input = fixture(); input.lock.packages["node_modules/prisma"].dependencies.mysql2 = "^3.15.3";
  assert.throws(() => checkAudit(input), /edge changed/);
});
test("changed database Prisma declaration fails", () => {
  const input = fixture(); input.lock.packages["packages/database"].devDependencies.prisma = "^7.10.0";
  assert.throws(() => checkAudit(input), /Database Prisma dependency changed/);
});
test("changed audit node location fails", () => {
  const input = fixture(); input.audit.vulnerabilities.mysql2.nodes.push("node_modules/other/node_modules/mysql2");
  assert.throws(() => checkAudit(input), /locations changed/);
});
test("changed inherited finding provenance fails", () => {
  const input = fixture(); input.audit.vulnerabilities.prisma.via = ["mysql2"];
  assert.throws(() => checkAudit(input), /parent findings changed/);
});
test("changed package attribution for an approved advisory fails", () => {
  const input = fixture(); input.audit.vulnerabilities.mysql2.via[0].dependency = "other";
  assert.throws(() => checkAudit(input), /dependency mismatch/);
});
test("a partial known exception set requires review", () => {
  const input = fixture(); delete input.audit.vulnerabilities.prisma; recount(input.audit);
  assert.throws(() => checkAudit(input), /exception set changed/);
});
for (const environment of [undefined, "production", "staging"]) {
  test(`known exception denied for SAMMA_ENV=${environment}`, () => {
    assert.throws(() => checkAudit({ ...fixture(), environment }), /DEV-only/);
  });
}
test("unrelated moderate findings remain visible without changing the original high threshold", () => {
  const input = fixture(); addFinding(input.audit, "moderate");
  assert.equal(checkAudit(input).exception, true);
});
test("clean audit passes without using an exception", () => {
  const input = fixture(); input.audit.vulnerabilities = {}; recount(input.audit); input.environment = "production";
  assert.deepEqual(checkAudit(input), { exception: false, advisoryIds: [] });
});
test("inconsistent counts fail closed", () => {
  const input = fixture(); input.audit.metadata.vulnerabilities.high = 0;
  assert.throws(() => checkAudit(input), /Inconsistent high/);
});
test("malformed and unsupported reports fail closed", () => {
  for (const audit of [null, {}, { ...report, error: {} }, { ...report, auditReportVersion: 1 }, { ...report, vulnerabilities: [] }]) {
    assert.throws(() => checkAudit({ ...fixture(), audit }));
  }
});
test("npm audit exit 1 is accepted for parsing only when it contains a valid findings report", () => {
  assert.deepEqual(parseAuditProcess({ status: 1, stdout: JSON.stringify(report) }), report);
});
test("npm failures, timeouts, invalid JSON and inconsistent exit status fail closed", () => {
  for (const result of [
    { status: 1, stdout: JSON.stringify({ error: { code: "ENOAUDIT" } }) },
    { status: 2, stdout: JSON.stringify(report) },
    { status: 0, stdout: JSON.stringify(report) },
    { status: 1, stdout: "not json" },
    { status: null, signal: "SIGTERM", stdout: JSON.stringify(report) },
    { status: 1, error: new Error("timeout"), stdout: JSON.stringify(report) },
  ]) assert.throws(() => parseAuditProcess(result));
});
