import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.test') });

import { randomUUID } from 'crypto';

async function runConcurrencyTest() {
  const { employeeInvitationService } = await import('../src/services/EmployeeInvitationService');
  const { pool } = await import('../src/config/database');

  const testCompanyId = randomUUID();
  const adminId = randomUUID();
  const testEmail = `test-conc-${Date.now()}@example.com`;

  try {
    console.log('Starting Concurrency Test...');

    const client = await pool.connect();
    await client.query("SET app.current_tenant_id = '00000000-0000-0000-0000-000000000000'");
    await client.query("SET app.current_user_id = '00000000-0000-0000-0000-000000000000'");

    // 1. Setup Test Data
    console.log('Setting up test data...');
    
    await client.query(
      `INSERT INTO companies (
        id,
        name,
        slug,
        email,
        plan,
        employee_limit,
        subscription_status,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        testCompanyId,
        'Concurrency Test Corp',
        `conc-test-${Date.now()}`,
        testEmail,
        'silver',
        2,
        'active',
        true,
      ]
    );

    // Create Admin User
    await client.query(
      `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [adminId, testCompanyId, testEmail, 'hash', 'Admin', 'User', 'owner', true, true]
    );

    // 2. Run Concurrent Invitations
    console.log('Running 5 concurrent invitations...');
    const promises: Array<Promise<any>> = [];
    for (let i = 0; i < 5; i++) {
      const inviteEmail = `invite-${i}-${Date.now()}@example.com`;
      promises.push(
        employeeInvitationService.sendInvitation(
          testCompanyId,
          adminId,
          {
            email: inviteEmail,
            firstName: `Invitee`,
            lastName: `${i}`,
            role: 'employee'
          }
        ).then(res => ({ status: 'fulfilled', value: res }))
         .catch(err => ({ status: 'rejected', reason: err }))
      );
    }

    const results = await Promise.all(promises);

    // 3. Analyze Results
    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    console.log(`Results: ${successes.length} successes, ${failures.length} failures`);

    failures.forEach((f: any) => console.log('Failure reason:', f.reason?.message || 'Unknown error'));

    if (successes.length > 1) {
      throw new Error(`Race condition suspected: expected <= 1 success, got ${successes.length}`);
    }

    // 4. Cleanup
    console.log('Cleaning up...');
    await client.query('DELETE FROM employee_invitations WHERE company_id = $1', [testCompanyId]);
    await client.query('DELETE FROM audit_logs WHERE company_id = $1', [testCompanyId]);
    await client.query('DELETE FROM users WHERE company_id = $1', [testCompanyId]);
    await client.query('DELETE FROM companies WHERE id = $1', [testCompanyId]);

    client.release();

    console.log('Test Complete.');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Test Failed:', error);
    try {
        const { pool } = await import('../src/config/database');
        const client = await pool.connect();
        await client.query("SET app.current_tenant_id = '00000000-0000-0000-0000-000000000000'");
        await client.query("SET app.current_user_id = '00000000-0000-0000-0000-000000000000'");
        await client.query('DELETE FROM employee_invitations WHERE company_id = $1', [testCompanyId]);
        await client.query('DELETE FROM audit_logs WHERE company_id = $1', [testCompanyId]);
        await client.query('DELETE FROM users WHERE company_id = $1', [testCompanyId]);
        await client.query('DELETE FROM companies WHERE id = $1', [testCompanyId]);
        client.release();
        await pool.end();
    } catch (e) {
        // ignore
    }
    process.exit(1);
  }
}

runConcurrencyTest();
