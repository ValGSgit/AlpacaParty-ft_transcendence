import { test, expect } from '@playwright/test';
import { authHeaders, createUser, uniqueId } from './helpers/api.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function loginAsSeeded(request, email, password = 'LiveSeed123!') {
  const res = await request.post('/api/auth/login', {
    data: { username: email, password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { token: body.accessToken, user: body.user };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Organizations', () => {
  let demoToken;
  let demoUser;

  test.beforeAll(async ({ request }) => {
    const demo = await loginAsSeeded(request, 'live_demo@alpacaparty.test');
    demoToken = demo.token;
    demoUser = demo.user;
  });

  test('GET /api/organizations returns organization list', async ({ request }) => {
    const res = await request.get('/api/organizations', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(Array.isArray(body.organizations)).toBeTruthy();
    expect(body.organizations.length).toBeGreaterThan(0);
  });

  test('full organization lifecycle: create, add member, get details, remove member, delete', async ({
    request,
  }) => {
    const orgName = `E2E Org ${uniqueId('org')}`;

    // 1. Create organization
    const createRes = await request.post('/api/organizations', {
      headers: authHeaders(demoToken),
      data: { name: orgName, description: 'Created by E2E test' },
    });
    expect(createRes.status()).toBe(201);

    const created = await createRes.json();
    const orgId = created.organization.id;
    expect(orgId).toBeTruthy();
    expect(created.organization.name).toBe(orgName);

    // 2. Create a test user and add as member
    const member = await createUser(request, 'orgmember');

    const addRes = await request.post(`/api/organizations/${orgId}/members`, {
      headers: authHeaders(demoToken),
      data: { userId: member.user.id },
    });
    expect([200, 201].includes(addRes.status())).toBeTruthy();

    // 3. Get organization details with members
    const detailRes = await request.get(`/api/organizations/${orgId}`, {
      headers: authHeaders(demoToken),
    });
    expect(detailRes.ok()).toBeTruthy();

    const detail = await detailRes.json();
    expect(detail.organization.name).toBe(orgName);
    const members = detail.organization.members ?? detail.organization.Members ?? [];
    expect(members.length).toBeGreaterThanOrEqual(1);

    // 4. Remove the member
    const removeRes = await request.delete(`/api/organizations/${orgId}/members/${member.user.id}`, {
      headers: authHeaders(demoToken),
    });
    expect(removeRes.ok()).toBeTruthy();

    // 5. Delete the organization
    const deleteRes = await request.delete(`/api/organizations/${orgId}`, {
      headers: authHeaders(demoToken),
    });
    expect(deleteRes.ok()).toBeTruthy();

    // Verify it no longer exists
    const getDeleted = await request.get(`/api/organizations/${orgId}`, {
      headers: authHeaders(demoToken),
    });
    expect(getDeleted.status()).toBe(404);
  });

  test('GET /api/organizations/mine returns user organizations', async ({ request }) => {
    const res = await request.get('/api/organizations/mine', {
      headers: authHeaders(demoToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(Array.isArray(body.organizations)).toBeTruthy();
  });

  test('update organization details', async ({ request }) => {
    const orgName = `Updatable Org ${uniqueId('upd')}`;

    const createRes = await request.post('/api/organizations', {
      headers: authHeaders(demoToken),
      data: { name: orgName, description: 'Original description' },
    });
    expect(createRes.status()).toBe(201);
    const { organization } = await createRes.json();

    const newDescription = 'Updated by E2E test';
    const updateRes = await request.put(`/api/organizations/${organization.id}`, {
      headers: authHeaders(demoToken),
      data: { description: newDescription },
    });
    expect(updateRes.ok()).toBeTruthy();

    const updated = await updateRes.json();
    expect(updated.organization.description).toBe(newDescription);

    // Cleanup
    await request.delete(`/api/organizations/${organization.id}`, {
      headers: authHeaders(demoToken),
    });
  });

  test('non-owner cannot delete organization', async ({ request }) => {
    const orgName = `Protected Org ${uniqueId('prot')}`;

    const createRes = await request.post('/api/organizations', {
      headers: authHeaders(demoToken),
      data: { name: orgName, description: 'Test org' },
    });
    expect(createRes.status()).toBe(201);
    const { organization } = await createRes.json();

    // Another user tries to delete
    const otherUser = await createUser(request, 'noperm');
    const delRes = await request.delete(`/api/organizations/${organization.id}`, {
      headers: authHeaders(otherUser.accessToken),
    });
    expect([403, 404].includes(delRes.status())).toBeTruthy();

    // Cleanup by owner
    await request.delete(`/api/organizations/${organization.id}`, {
      headers: authHeaders(demoToken),
    });
  });
});
