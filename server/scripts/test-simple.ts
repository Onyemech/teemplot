console.log('Hello from test-simple.ts');
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(__dirname, '../.env.development');
console.log('Loading env from:', envPath);
const result = config({ path: envPath });
if (result.error) {
    console.error('Dotenv error:', result.error);
}
console.log('Parsed env keys:', Object.keys(result.parsed || {}));

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set');

async function main() {
    console.log('Importing DatabaseFactory...');
    // ...');
    const { DatabaseFactory } = await import('../src/infrastructure/database/DatabaseFactory');
    console.log('DatabaseFactory imported.');
    try {
        const db = DatabaseFactory.getPrimaryDatabase();
        console.log('DB initialized.');
        await db.healthCheck();
        console.log('Health check passed.');
        await DatabaseFactory.closeAll();
        console.log('Closed.');
    } catch (e) {
        console.error('Error:', e);
    }
}
main();
