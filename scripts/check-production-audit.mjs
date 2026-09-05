import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Temporary DEV exception; remove with docs/PRISMA-SECURITY-EXCEPTION.md.
const versions = {
  prisma: "7.10.0",
  "@prisma/client": "7.10.0",
  "@prisma/adapter-pg": "7.10.0",
  "@prisma/config": "7.10.0",
  "deepmerge-ts": "7.1.5",
  mysql2: "3.15.3",
};
const advisories = {
  "deepmerge-ts": { "GHSA-ggr8-5vv4-36mx": "high" },
  mysql2: { "GHSA-3f6p-5ww8-9rcr": "high", "GHSA-rgwj-5xj2-c3m3": "moderate" },
};
const parents = { "@prisma/config": ["deepmerge-ts"], prisma: ["@prisma/config", "mysql2"] };
const effects = { "deepmerge-ts": ["@prisma/config"], mysql2: ["prisma"], "@prisma/config": ["prisma"], prisma: [] };
const levels = ["info", "low", "moderate", "high", "critical"];
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const sameMembers = (actual, expected, message) => {
  assert.ok(Array.isArray(actual), message);
  assert.deepEqual([...actual].sort(), [...expected].sort(), message);
};

export function checkAudit({ audit, lock, installed, environment }) {
  assert.ok(object(lock?.packages), "Missing lockfile packages");
  for (const [name, version] of Object.entries(versions)) {
    const path = `node_modules/${name}`;
    const paths = Object.keys(lock.packages).filter(key => key === path || key.endsWith(`/${path}`));
    sameMembers(paths, [path], `Unexpected installation paths for ${name}`);
    assert.equal(lock.packages[path].version, version, `Unapproved locked version: ${name}`);
    assert.equal(installed?.[path]?.name, name, `Installed package name mismatch: ${name}`);
    assert.equal(installed[path].version, version, `Unapproved installed version: ${name}`);
  }
  assert.equal(lock.packages["node_modules/prisma"].dependencies?.mysql2, versions.mysql2, "Prisma mysql2 edge changed");
  assert.equal(lock.packages["node_modules/prisma"].dependencies?.["@prisma/config"], versions["@prisma/config"], "Prisma config edge changed");
  assert.equal(lock.packages["node_modules/@prisma/config"].dependencies?.["deepmerge-ts"], versions["deepmerge-ts"], "Prisma deepmerge edge changed");
  const database = lock.packages["packages/database"];
  for (const name of ["@prisma/client", "@prisma/adapter-pg"]) {
    assert.equal(database?.dependencies?.[name], versions[name], `Database dependency changed: ${name}`);
  }
  assert.equal(database?.devDependencies?.prisma, versions.prisma, "Database Prisma dependency changed");

  assert.ok(object(audit) && !audit.error, "Audit failed or returned an error");
  assert.equal(audit.auditReportVersion, 2, "Unsupported audit report format");
  assert.ok(object(audit.vulnerabilities), "Missing vulnerability findings");
  const counts = Object.fromEntries(levels.map(level => [level, 0]));
  for (const [name, finding] of Object.entries(audit.vulnerabilities)) {
    assert.ok(object(finding) && finding.name === name && levels.includes(finding.severity), "Malformed finding");
    assert.ok(Array.isArray(finding.via) && finding.via.length > 0, "Missing finding provenance");
    assert.ok(Array.isArray(finding.nodes) && finding.nodes.length > 0, "Missing finding locations");
    counts[finding.severity]++;
    assert.notEqual(finding.severity, "critical", `Critical vulnerability: ${name}`);
    for (const via of finding.via) {
      if (typeof via === "string") {
        assert.ok(object(audit.vulnerabilities[via]), "Unresolved vulnerability reference");
      } else {
        assert.ok(object(via) && levels.includes(via.severity) && typeof via.url === "string", "Malformed advisory");
        assert.notEqual(via.severity, "critical", `Critical advisory: ${via.url}`);
        assert.ok(levels.indexOf(via.severity) <= levels.indexOf(finding.severity), "Advisory severity exceeds finding severity");
      }
    }
    if (finding.severity === "high") {
      assert.ok(Object.hasOwn(effects, name), `Unknown high finding: ${name}`);
    }
  }
  const summary = audit.metadata?.vulnerabilities;
  for (const level of levels) assert.equal(summary?.[level], counts[level], `Inconsistent ${level} audit count`);
  assert.equal(summary.total, Object.keys(audit.vulnerabilities).length, "Inconsistent total audit count");

  const knownFindings = Object.keys(audit.vulnerabilities).filter(name => Object.hasOwn(effects, name));
  if (counts.high === 0 && knownFindings.length === 0) return { exception: false, advisoryIds: [] };
  assert.equal(environment, "development", "Prisma exception is DEV-only; set SAMMA_ENV=development explicitly");
  sameMembers(knownFindings, Object.keys(effects), "Known exception set changed; security review required");
  assert.equal(counts.high, 4, "Known high finding count changed");
  for (const name of knownFindings) {
    const finding = audit.vulnerabilities[name];
    assert.equal(finding.severity, "high", `Known finding severity changed: ${name}`);
    assert.equal(finding.isDirect, name === "prisma", `Known dependency scope changed: ${name}`);
    sameMembers(finding.nodes, [`node_modules/${name}`], `Known finding locations changed: ${name}`);
    sameMembers(finding.effects, effects[name], `Known dependency effects changed: ${name}`);
    if (Object.hasOwn(parents, name)) {
      sameMembers(finding.via, parents[name], `Known parent findings changed: ${name}`);
    } else {
      assert.ok(finding.via.every(object), `Unexpected advisory reference: ${name}`);
      sameMembers(finding.via.map(via => via.url), Object.keys(advisories[name]).map(id => `https://github.com/advisories/${id}`), `Unapproved advisory set: ${name}`);
      for (const via of finding.via) {
        assert.equal(via.name, name, "Advisory package mismatch");
        assert.equal(via.dependency, name, "Advisory dependency mismatch");
        assert.equal(via.severity, advisories[name][via.url.split("/").at(-1)], "Advisory severity changed");
      }
    }
  }
  return { exception: true, advisoryIds: Object.values(advisories).flatMap(Object.keys) };
}

export function parseAuditProcess(result) {
  assert.ok(!result.error && !result.signal && [0, 1].includes(result.status), "npm audit did not complete successfully");
  const audit = JSON.parse(result.stdout);
  assert.ok(object(audit) && !audit.error, "npm audit returned an error");
  const counts = audit.metadata?.vulnerabilities;
  assert.ok(counts, "npm audit returned no vulnerability counts");
  assert.equal(result.status, counts.high > 0 || counts.critical > 0 ? 1 : 0, "npm audit status/report mismatch");
  return audit;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const npm = (args) => spawnSync("npm", args, { cwd: root, encoding: "utf8", timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  const result = npm(["audit", "--omit=dev", "--audit-level=high", "--json"]);
  // Preserve the complete npm report, including findings not covered by this exception.
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  try {
    const audit = parseAuditProcess(result);
    const tree = npm(["ls", ...Object.keys(versions), "--json"]);
    process.stdout.write(tree.stdout || "");
    process.stderr.write(tree.stderr || "");
    assert.ok(!tree.error && !tree.signal && tree.status === 0, "Invalid Prisma dependency tree");
    const treeReport = JSON.parse(tree.stdout);
    assert.ok(!treeReport.error && !treeReport.problems?.length, "Prisma dependency tree has problems");
    const read = path => JSON.parse(readFileSync(resolve(root, path), "utf8"));
    const installed = Object.fromEntries(Object.keys(versions).map(name => [`node_modules/${name}`, read(`node_modules/${name}/package.json`)]));
    const outcome = checkAudit({ audit, lock: read("package-lock.json"), installed, environment: process.env.SAMMA_ENV });
    if (outcome.exception) {
      console.log("KNOWN TEMPORARY PRISMA SECURITY EXCEPTION — DEV ONLY");
      for (const id of outcome.advisoryIds) console.log(`- ${id}`);
      console.log("PASS WITH DOCUMENTED EXCEPTION. Not production/sensitive-data approval. See docs/PRISMA-SECURITY-EXCEPTION.md.");
    } else console.log("PASS: no high/critical findings; no exception used.");
  } catch (error) {
    console.error(`SECURITY AUDIT FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
