import 'dotenv/config';
import { pool } from '../src/config/database';
import axios from 'axios';
import { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const API_URL = 'http://localhost:5000/api';

async function main() {
  const client = await pool.connect();
  try {
    console.log('Setting up test data...');
    
    // 1. Create Company
    // Debug: Check columns
    const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'companies';
    `);
    console.log('Companies columns:', cols.rows);

    const companyId = uuidv4();
    await client.query(`
      INSERT INTO companies (id, name, slug, email, biometrics_required)
      VALUES ($1, $2, $3, $4, $5)
    `, [companyId, 'Bio Test Corp', 'bio-test-' + Date.now(), 'bio@test.com', false]);

    // 2. Create User (Owner)
    // Debug: Check specific columns with schema
    const debugCols = await client.query(`
        SELECT table_schema, column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND (column_name LIKE '%pass%' OR column_name LIKE '%company%');
    `);
    console.log('Users debug columns with schema:', debugCols.rows);

    const userId = uuidv4();
    const passwordHash = await hash('password123', 10);
    const email = `owner-${Date.now()}@biotest.com`;
    
    // Try using password_hash based on RegistrationService pattern
    await client.query(`
      INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, email_verified, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [userId, companyId, email, passwordHash, 'Bio', 'Owner', 'owner', true, true]);

    console.log(`Created test user: ${email} / password123`);

    // 3. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email,
      password: 'password123'
    });

    const cookie = loginRes.headers['set-cookie'];
    if (!cookie) throw new Error('No cookie received');
    console.log('Login successful.');

    const axiosConfig = {
      headers: {
        Cookie: cookie
      },
      withCredentials: true
    };

    // 4. Test: Biometrics Disabled initially
    console.log('Testing Check-in with Biometrics Disabled (should succeed without proof)...');
    try {
        await axios.post(`${API_URL}/attendance/check-in`, {
            method: 'manual',
            location: { latitude: 0, longitude: 0 }
        }, axiosConfig);
        console.log('✅ Check-in succeeded as expected (Biometrics Disabled)');
    } catch (e: any) {
        console.error('❌ Check-in failed unexpectedly:', e.response?.data || e.message);
    }

    // Reset attendance (clock out or delete)
    await client.query('DELETE FROM attendance_records WHERE user_id = $1', [userId]);

    // 5. Enable Biometrics
    console.log('Enabling Biometrics via Settings...');
    await axios.patch(`${API_URL}/company-settings/biometrics`, {
        biometricsRequired: true
    }, axiosConfig);
    console.log('✅ Biometrics enabled.');

    // 6. Test: Check-in without proof (should fail)
    console.log('Testing Check-in WITHOUT proof (should fail)...');
    try {
        await axios.post(`${API_URL}/attendance/check-in`, {
            method: 'manual',
            location: { latitude: 0, longitude: 0 }
        }, axiosConfig);
        console.error('❌ Check-in succeeded unexpectedly!');
    } catch (e: any) {
        if (e.response?.data?.message === 'Biometric verification required') {
            console.log('✅ Check-in failed as expected: Biometric verification required');
        } else {
            console.error('❌ Check-in failed with unexpected error:', e.response?.data || e.message);
        }
    }

    // 7. Test: Check-in WITH proof (should succeed)
    console.log('Testing Check-in WITH proof (should succeed)...');
    try {
        await axios.post(`${API_URL}/attendance/check-in`, {
            method: 'manual',
            location: { latitude: 0, longitude: 0 },
            biometricsProof: 'dummy-proof-string'
        }, axiosConfig);
        console.log('✅ Check-in succeeded with proof.');
    } catch (e: any) {
        console.error('❌ Check-in failed unexpectedly with proof:', e.response?.data || e.message);
    }

    console.log('Test completed.');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    client.release();
    // Don't close pool immediately as other connections might be active in dev mode, 
    // but here we are running as a script, so we should close it.
    await pool.end();
  }
}

main();
