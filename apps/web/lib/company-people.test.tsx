import React from "react";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createPrismaClient } from "@samma/database";
import { CompanyPeople } from "../components/company-people";
import { companyPersonDetail, companyPersonIdentity, companyPersonSelect } from "./company-people";
import { allowedRelationshipDefinitions } from "./record-service";

// Reuse only the disposable employment validation database, never the runtime DB.
assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/samma_employment_test");
const db = createPrismaClient();
const prefix = `people-cards-${randomUUID()}`;
const owner = `${prefix}-owner`, person = `${prefix}-person`, outsider = `${prefix}-outsider`;
const company = `${prefix}-company`, other = `${prefix}-other`, member = `${prefix}-member`;
const role = `${prefix}-role`, definition = `${prefix}-definition`;
const states = ["ACTIVE", "PENDING", "FORMER", "ENDED"] as const;
const relationshipId = (state: string) => `${prefix}-${state}`;

before(async () => {
  for (const id of [owner, person, outsider]) await db.account.create({ data: { id, primaryEmail: `${id}@example.test`, emailVerified: true,
    person: { create: { id: `person-${id}`, displayName: "Synthetic Connected Person" } } } });
  await db.functionalRoleDefinition.create({ data: { id: role, code: role, label: "Synthetic HR", capabilities: [] } });
  await db.company.create({ data: { id: company, name: "Synthetic Cards Company", members: { create: { id: member, accountId: owner, status: "ACTIVE", roleGrants: { create: { functionalRoleId: role } } } } } });
  await db.company.create({ data: { id: other, name: "Unrelated Company", members: { create: { accountId: outsider, status: "ACTIVE" } } } });
  for (const status of states) await db.personCompanyRelationship.create({ data: { id: relationshipId(status), companyId: company, personId: `person-${person}`, status, relationshipType: "EMPLOYMENT" } });
  await db.recordDefinition.create({ data: { id: definition, key: definition, versions: { create: { id: `${definition}-v1`, version: 1, name: "Synthetic record", category: "TEST", context: "RELATIONSHIP", direction: "BIDIRECTIONAL", classification: "PERSONAL", allowedCompanyRoles: [role] } } } });
});
after(async () => {
  await db.personCompanyRelationship.deleteMany({ where: { companyId: company } });
  await db.companyRoleGrant.deleteMany({ where: { companyMemberId: member } });
  await db.companyMember.deleteMany({ where: { companyId: { in: [company, other] } } });
  await db.company.deleteMany({ where: { id: { in: [company, other] } } });
  await db.recordDefinitionVersion.deleteMany({ where: { recordDefinitionId: definition } });
  await db.recordDefinition.deleteMany({ where: { id: definition } });
  await db.functionalRoleDefinition.deleteMany({ where: { id: role } });
  await db.person.deleteMany({ where: { accountId: { in: [owner, person, outsider] } } });
  await db.account.deleteMany({ where: { id: { in: [owner, person, outsider] } } });
  await db.$disconnect();
});

test("separate cards retain every state, names/emails and exact relationship actions", async () => {
  const relationships = await db.personCompanyRelationship.findMany({ where: { companyId: company }, select: companyPersonSelect });
  assert.equal(relationships.length, 4);
  const people = await Promise.all(relationships.map(async relationship => ({ relationship, canAddRecord: (await allowedRelationshipDefinitions(db, owner, relationship.id)).length > 0 })));
  const html = renderToStaticMarkup(<CompanyPeople companyId={company} companyName="Synthetic Cards Company" roles="Company Owner" canAddPerson people={people} />);
  assert.equal((html.match(/Add person<\/a>/g) || []).length, 1);
  assert.ok(html.indexOf('Add person</a>') < html.indexOf('company-people-section'));
  assert.ok(html.includes('<dt>People</dt><dd>4</dd>'));
  assert.ok(html.includes('<dt>Active</dt><dd>1</dd>'));
  assert.ok(html.includes('<dt>Former</dt><dd>2</dd>'));
  assert.equal((html.match(/company-person-avatar/g) || []).length, 4);
  assert.equal((html.match(/Employment relationship<\/p>/g) || []).length, 4);
  assert.equal((html.match(/company-person-card/g) || []).length, 4);
  for (const state of states) {
    assert.ok(html.includes(`href="/company/relationships/${relationshipId(state)}"`));
    assert.ok(html.includes(`>${state}</span>`));
    assert.equal(html.includes(`href="/company/relationships/${relationshipId(state)}/add-record"`), state === "ACTIVE");
  }
  assert.ok(html.includes('Synthetic Connected Person</h3>'));
  assert.ok(html.includes(`${person}@example.test</p>`));
  assert.equal((html.match(/>EMPLOYMENT<\/span>/g) || []).length, 4);
  assert.ok(!html.includes(`/company/relationships/${person}@`));
});

test("empty and single-person sections keep company actions outside the card grid", async () => {
  for (const canAddPerson of [true, false]) {
    const html = renderToStaticMarkup(<CompanyPeople companyId="company / test" companyName="Company" roles="Member" canAddPerson={canAddPerson} people={[]} />);
    assert.ok(html.includes('No people connected yet.'));
    assert.ok(html.includes('<dt>People</dt><dd>0</dd>'));
    assert.equal((html.match(/href="\/company\/people\/add\?companyId=company%20%2F%20test"/g) || []).length, canAddPerson ? 2 : 0);
    assert.ok(!html.includes('company-person-card'));
  }
  const relationship = await companyPersonDetail(db, owner, relationshipId("ACTIVE"));
  assert.ok(relationship);
  const html = renderToStaticMarkup(<CompanyPeople companyId={company} companyName="Company" roles="Member" canAddPerson people={[{ relationship, canAddRecord: false }]} />);
  assert.equal((html.match(/Add person<\/a>/g) || []).length, 1);
  assert.equal((html.match(/company-person-card/g) || []).length, 1);
  assert.ok(!html.includes('Add record'));
});

test("blank display name falls back to email, preferring the accepted invitation address", async () => {
  const relationship = await companyPersonDetail(db, owner, relationshipId("ACTIVE"));
  assert.ok(relationship);
  const blank = { ...relationship, person: { ...relationship.person, displayName: "   " } };
  assert.deepEqual(companyPersonIdentity(blank), { name: `${person}@example.test`, email: `${person}@example.test` });
  const invited = { ...blank, employmentInvitations: [{ invitedEmail: "accepted@example.test" }] };
  assert.deepEqual(companyPersonIdentity(invited), { name: "accepted@example.test", email: "accepted@example.test" });
  const html = renderToStaticMarkup(<CompanyPeople companyId={company} companyName="Company" roles="Member" canAddPerson={false} people={[{ relationship: invited, canAddRecord: false }]} />);
  assert.ok(html.includes('accepted@example.test</h3>'));
  assert.ok(!html.includes('Add person')); assert.ok(!html.includes('Add record'));
});

test("detail uses membership scope, stable relationship ID and historical visibility", async () => {
  for (const state of states) assert.equal((await companyPersonDetail(db, owner, relationshipId(state)))?.id, relationshipId(state));
  for (const accountId of [outsider, person, "missing"]) assert.equal(await companyPersonDetail(db, accountId, relationshipId("ACTIVE")), null);
  for (const id of [person, `${person}@example.test`, "Synthetic Connected Person", "missing"]) assert.equal(await companyPersonDetail(db, owner, id), null);
  for (const status of ["REMOVED", "DISABLED", "INVITED"] as const) {
    await db.companyMember.update({ where: { id: member }, data: { status } });
    assert.equal(await companyPersonDetail(db, owner, relationshipId("ACTIVE")), null);
    assert.equal((await allowedRelationshipDefinitions(db, owner, relationshipId("ACTIVE"))).length, 0);
  }
  await db.companyMember.update({ where: { id: member }, data: { status: "ACTIVE" } });
});

test("upload action denies wrong tenant, revoked roles, disabled roles and inactive company", async () => {
  const allowed = (accountId = owner) => allowedRelationshipDefinitions(db, accountId, relationshipId("ACTIVE"));
  for (const accountId of [outsider, person, "missing"]) assert.equal((await allowed(accountId)).length, 0);
  await db.companyRoleGrant.updateMany({ where: { companyMemberId: member }, data: { revokedAt: new Date() } });
  assert.equal((await allowed()).length, 0);
  await db.companyRoleGrant.updateMany({ where: { companyMemberId: member }, data: { revokedAt: null } });
  await db.functionalRoleDefinition.update({ where: { id: role }, data: { active: false } });
  assert.equal((await allowed()).length, 0);
  await db.functionalRoleDefinition.update({ where: { id: role }, data: { active: true } });
  await db.company.update({ where: { id: company }, data: { status: "SUSPENDED" } });
  assert.equal((await allowed()).length, 0);
  assert.equal(await companyPersonDetail(db, owner, relationshipId("ACTIVE")), null);
  await db.company.update({ where: { id: company }, data: { status: "ACTIVE" } });
  assert.equal((await allowed()).length, 1);
});

test("newest active definition controls entry without falling back to a permitted historic version", async () => {
  await db.recordDefinitionVersion.create({ data: { id: `${definition}-v2`, recordDefinitionId: definition, version: 2, name: "Synthetic restricted record", category: "TEST", context: "RELATIONSHIP", direction: "BIDIRECTIONAL", classification: "PERSONAL", allowedCompanyRoles: [] } });
  assert.equal((await allowedRelationshipDefinitions(db, owner, relationshipId("ACTIVE"))).length, 0);
  await db.recordDefinitionVersion.update({ where: { id: `${definition}-v2` }, data: { allowedCompanyRoles: [role] } });
  assert.deepEqual((await allowedRelationshipDefinitions(db, owner, relationshipId("ACTIVE"))).map(row => row.id), [`${definition}-v2`]);
});
