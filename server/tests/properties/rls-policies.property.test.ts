/**
 * Property-Based Test: RLS (Row-Level Security) Policies
 * Property 6: Cross-Tenant Access Prevention (Requirements 1.6)
 */

import fc from 'fast-check';
import { Pool } from 'pg';
import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';

let pool: Pool;
const TEST_ITERATIONS = 10;

// Arbitraries for generating test data
const uuidArbitrary = fc.uuid();




async function createTestCompany(companyId: string, name: string): Promise<void> {
  const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${companyId.substring(0, 8)}`;
  await pool.query(
    `INSERT INTO companies (id, name, email, slug, employee_count, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [companyId, name, `${slug}@test.com`, slug, 10]
  );
}

/**
 * Helper: Create a test user
 */
async function createTestUser(
  userId: string,
  companyId: string,
  email: string,
  role: string
): Promise<void> {
  await pool.query(
    `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, email_verified, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [userId, companyId, email, 'test_hash', 'Test', 'User', role]
  );
}

/**
 * Helper: Set PostgreSQL session variables for RLS
 */
async function setSessionContext(tenantId: string, userId: string): Promise<void> {
  await pool.query(`SET app.current_tenant_id = '${tenantId}'`);
  await pool.query(`SET app.current_user_id = '${userId}'`);
}

/**
 * Helper: Reset PostgreSQL session variables
 */
async function resetSessionContext(): Promise<void> {
  await pool.query(`RESET app.current_tenant_id`);
  await pool.query(`RESET app.current_user_id`);
}

/**
 * Helper: Create company settings for a company
 */
async function createCompanySettings(companyId: string): Promise<string> {
  const result = await pool.query(
    `INSERT INTO company_settings (company_id)
     VALUES ($1)
     ON CONFLICT (company_id) DO NOTHING
     RETURNING id`,
    [companyId]
  );
  return result.rows[0]?.id;
}

/**
 * Helper: Attempt to read company settings (should be blocked by RLS if cross-tenant)
 */
async function attemptReadCompanySettings(companyId: string): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM company_settings WHERE company_id = $1`,
    [companyId]
  );
  return result.rows;
}

/**
 * Helper: Attempt to read notifications (should be blocked by RLS if cross-tenant or cross-user)
 */
async function attemptReadNotifications(userId: string): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1`,
    [userId]
  );
  return result.rows;
}

/**
 * Helper: Create a notification
 */
async function createNotification(
  companyId: string,
  userId: string,
  type: string,
  title: string
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO notifications (company_id, user_id, type, title, body, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id`,
    [companyId, userId, type, title, 'Test notification']
  );
  return result.rows[0].id;
}
async function attemptReadAuditLogs(companyId: string): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM audit_logs WHERE company_id = $1`,
    [companyId]
  );
  return result.rows;
}

/**
 * Helper: Create an audit log entry
 */
async function createAuditLog(
  companyId: string,
  userId: string,
  action: string
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id`,
    [companyId, userId, action, 'test_entity', companyId]
  );
  return result.rows[0].id;
}

describe('Property 6: Cross-Tenant Access Prevention', () => {
  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({ 
      connectionString,
      max: 5, // Limit pool size for tests
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    
    // Test connection and set up test environment
    try {
      // First, set dummy session variables to pass Supabase's validation
      await pool.query(`SET app.current_tenant_id = '00000000-0000-0000-0000-000000000000'`);
      await pool.query(`SET app.current_user_id = '00000000-0000-0000-0000-000000000000'`);
      
      const result = await pool.query('SELECT NOW()');
      console.log('✅ Database connection established:', result.rows[0]);
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('should block all cross-tenant access to company_settings', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary, // userTenantId
        uuidArbitrary, // resourceCompanyId
        uuidArbitrary, // userId
        async (userTenantId, resourceCompanyId, userId) => {
          // Precondition: Only test cross-tenant access (different tenant IDs)
          fc.pre(userTenantId !== resourceCompanyId);

          try {
            // Setup: Create two companies
            await createTestCompany(userTenantId, `Company ${userTenantId.substring(0, 8)}`);
            await createTestCompany(resourceCompanyId, `Company ${resourceCompanyId.substring(0, 8)}`);

            // Create a user in the first company
            await createTestUser(userId, userTenantId, `user-${userId}@test.com`, 'admin');

            // Create settings for the second company (the resource we're trying to access)
            await createCompanySettings(resourceCompanyId);

            // Set session context to the user's tenant
            await setSessionContext(userTenantId, userId);

            // Attempt to read settings from the other company
            const results = await attemptReadCompanySettings(resourceCompanyId);

            // Assertion: Should return empty array (RLS blocks access)
            expect(results).toHaveLength(0);

            // Reset session context
            await resetSessionContext();
          } catch (error) {
            // Clean up on error
            await resetSessionContext();
            throw error;
          }
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  it('should block all cross-tenant access to notifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary, // userTenantId
        uuidArbitrary, // resourceCompanyId
        uuidArbitrary, // userId
        uuidArbitrary, // targetUserId
        async (userTenantId, resourceCompanyId, userId, targetUserId) => {
          // Precondition: Different tenants and different users
          fc.pre(userTenantId !== resourceCompanyId && userId !== targetUserId);

          try {
            // Setup: Create two companies
            await createTestCompany(userTenantId, `Company ${userTenantId.substring(0, 8)}`);
            await createTestCompany(resourceCompanyId, `Company ${resourceCompanyId.substring(0, 8)}`);

            // Create users in both companies
            await createTestUser(userId, userTenantId, `user-${userId}@test.com`, 'admin');
            await createTestUser(targetUserId, resourceCompanyId, `user-${targetUserId}@test.com`, 'staff');

            // Create a notification for the target user in the other company
            await createNotification(resourceCompanyId, targetUserId, 'system', 'Test Notification');

            // Set session context to the first user's tenant
            await setSessionContext(userTenantId, userId);

            // Attempt to read notifications for the target user (in different company)
            const results = await attemptReadNotifications(targetUserId);

            // Assertion: Should return empty array (RLS blocks cross-tenant access)
            expect(results).toHaveLength(0);

            // Reset session context
            await resetSessionContext();
          } catch (error) {
            await resetSessionContext();
            throw error;
          }
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  it('should block cross-user access to notifications within same tenant', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary, // tenantId
        uuidArbitrary, // userId1
        uuidArbitrary, // userId2
        async (tenantId, userId1, userId2) => {
          // Precondition: Different users in same tenant
          fc.pre(userId1 !== userId2);

          try {
            // Setup: Create one company
            await createTestCompany(tenantId, `Company ${tenantId.substring(0, 8)}`);

            // Create two users in the same company
            await createTestUser(userId1, tenantId, `user1-${userId1}@test.com`, 'admin');
            await createTestUser(userId2, tenantId, `user2-${userId2}@test.com`, 'staff');

            // Create a notification for user2
            await createNotification(tenantId, userId2, 'task', 'Task Assigned');

            // Set session context to user1 (same tenant, different user)
            await setSessionContext(tenantId, userId1);

            // Attempt to read user2's notifications
            const results = await attemptReadNotifications(userId2);

            // Assertion: Should return empty array (RLS blocks cross-user access)
            expect(results).toHaveLength(0);

            // Reset session context
            await resetSessionContext();
          } catch (error) {
            await resetSessionContext();
            throw error;
          }
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  it('should allow same-tenant access to company_settings', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary, // tenantId
        uuidArbitrary, // userId
        async (tenantId, userId) => {
          try {
            // Setup: Create company and user
            await createTestCompany(tenantId, `Company ${tenantId.substring(0, 8)}`);
            await createTestUser(userId, tenantId, `user-${userId}@test.com`, 'owner');

            // Create settings for the company
            await createCompanySettings(tenantId);

            // Set session context to the user's tenant
            await setSessionContext(tenantId, userId);

            // Attempt to read settings from the same company
            const results = await attemptReadCompanySettings(tenantId);

            // Assertion: Should return the settings (RLS allows same-tenant access)
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].company_id).toBe(tenantId);

            // Reset session context
            await resetSessionContext();
          } catch (error) {
            await resetSessionContext();
            throw error;
          }
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  it('should allow same-user access to notifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary, // tenantId
        uuidArbitrary, // userId
        async (tenantId, userId) => {
          try {
            // Setup: Create company and user
            await createTestCompany(tenantId, `Company ${tenantId.substring(0, 8)}`);
            await createTestUser(userId, tenantId, `user-${userId}@test.com`, 'staff');

            // Create a notification for the user
            await createNotification(tenantId, userId, 'attendance', 'Clock In Reminder');

            // Set session context to the user
            await setSessionContext(tenantId, userId);

            // Attempt to read own notifications
            const results = await attemptReadNotifications(userId);

            // Assertion: Should return the notification (RLS allows same-user access)
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].user_id).toBe(userId);
            expect(results[0].company_id).toBe(tenantId);

            // Reset session context
            await resetSessionContext();
          } catch (error) {
            await resetSessionContext();
            throw error;
          }
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  it('should block all cross-tenant access to audit_logs', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary, // userTenantId
        uuidArbitrary, // resourceCompanyId
        uuidArbitrary, // userId
        async (userTenantId, resourceCompanyId, userId) => {
          // Precondition: Different tenants
          fc.pre(userTenantId !== resourceCompanyId);

          try {
            // Setup: Create two companies
            await createTestCompany(userTenantId, `Company ${userTenantId.substring(0, 8)}`);
            await createTestCompany(resourceCompanyId, `Company ${resourceCompanyId.substring(0, 8)}`);

            // Create a user in the first company
            await createTestUser(userId, userTenantId, `user-${userId}@test.com`, 'owner');

            // Create an audit log in the second company
            await createAuditLog(resourceCompanyId, userId, 'settings_updated');

            // Set session context to the user's tenant
            await setSessionContext(userTenantId, userId);

            // Attempt to read audit logs from the other company
            const results = await attemptReadAuditLogs(resourceCompanyId);

            // Assertion: Should return empty array (RLS blocks cross-tenant access)
            expect(results).toHaveLength(0);

            // Reset session context
            await resetSessionContext();
          } catch (error) {
            await resetSessionContext();
            throw error;
          }
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });

  it('should allow same-tenant access to audit_logs (read-only)', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArbitrary, // tenantId
        uuidArbitrary, // userId
        async (tenantId, userId) => {
          try {
            // Setup: Create company and user
            await createTestCompany(tenantId, `Company ${tenantId.substring(0, 8)}`);
            await createTestUser(userId, tenantId, `user-${userId}@test.com`, 'owner');

            // Create an audit log for the company
            await createAuditLog(tenantId, userId, 'employee_invited');

            // Set session context to the user's tenant
            await setSessionContext(tenantId, userId);

            // Attempt to read audit logs from the same company
            const results = await attemptReadAuditLogs(tenantId);

            // Assertion: Should return the audit log (RLS allows same-tenant read access)
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].company_id).toBe(tenantId);

            // Reset session context
            await resetSessionContext();
          } catch (error) {
            await resetSessionContext();
            throw error;
          }
        }
      ),
      { numRuns: TEST_ITERATIONS }
    );
  });
});
