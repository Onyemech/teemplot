
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
    const migrationPath = path.join(__dirname, 'migrations', 'drop_unused_indexes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    try {
        console.log('Dropping unused indexes for performance optimization...');
        console.log('This may take a few minutes...');
        await pool.query(sql);
        console.log('✅ Migration applied successfully!');
        console.log('All unused indexes have been dropped.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error('Full error:', err);
    } finally {
        await pool.end();
    }
}

applyMigration();