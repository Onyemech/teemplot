
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspect() {
    let output = '';
    try {
        const res = await pool.query(`
      SELECT routine_name, routine_definition 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION';
    `);

        output += '--- PUBLIC FUNCTIONS ---\n';
        res.rows.forEach(row => {
            output += `\nFUNCTION: ${row.routine_name}\n`;
            output += '-------------------------\n';
            output += row.routine_definition + '\n';
        });

        // Also check triggers
        const triggers = await pool.query(`
      SELECT event_object_table, trigger_name, action_statement, action_orientation, action_timing
      FROM information_schema.triggers
      WHERE trigger_schema = 'public';
    `);

        output += '\n--- TRIGGERS ---\n';
        output += JSON.stringify(triggers.rows, null, 2) + '\n';

        fs.writeFileSync('db_inspection_results.txt', output);
        console.log('Results written to db_inspection_results.txt');

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspect();
