// import { SQLiteDatabase } from '../../src/infrastructure/database/SQLiteDatabase';
// import { DatabaseFactory } from '../../src/infrastructure/database/DatabaseFactory';

// describe('SQLiteDatabase', () => {
//   let db: SQLiteDatabase;

//   beforeAll(() => {
//     db = DatabaseFactory.getPrimaryDatabase() as SQLiteDatabase;
//   });

//   describe('Connection and Health', () => {
//     it('should connect to database successfully', async () => {
//       const isHealthy = await db.healthCheck();
//       expect(isHealthy).toBe(true);
//     });

//     it('should return correct database type', () => {
//       expect(db.getType()).toBe('sqlite');
//     });
//   });

//   describe('CRUD Operations', () => {
//     describe('Insert', () => {
//       it('should insert a company record', async () => {
//         const companyData = {
//           id: 'test-company-1',
//           name: 'Test Company',
//           slug: 'test-company-1',
//           email: 'test@company.com',
//           timezone: 'UTC',
//           subscription_plan: 'trial',
//           subscription_status: 'active',
//           is_active: 1,
//         };

//         const result = await db.insert('companies', companyData);

//         expect(result).toBeDefined();
//         expect(result.id).toBe('test-company-1');
//         expect(result.name).toBe('Test Company');
//         expect(result.email).toBe('test@company.com');
//       });

//       it('should insert a user record', async () => {
//         // First create company
//         await db.insert('companies', {
//           id: 'company-for-user',
//           name: 'User Company',
//           slug: 'user-company',
//           email: 'company@test.com',
//         });

//         const userData = {
//           id: 'test-user-1',
//           company_id: 'company-for-user',
//           email: 'user@test.com',
//           password_hash: 'hashed_password',
//           first_name: 'John',
//           last_name: 'Doe',
//           role: 'admin',
//           is_active: 1,
//           email_verified: 0,
//         };

//         const result = await db.insert('users', userData);

//         expect(result).toBeDefined();
//         expect(result.id).toBe('test-user-1');
//         expect(result.email).toBe('user@test.com');
//         expect(result.first_name).toBe('John');
//         expect(result.role).toBe('admin');
//       });

//       it('should enforce unique constraints', async () => {
//         const companyData = {
//           id: 'unique-test-1',
//           name: 'Unique Test',
//           slug: 'unique-slug',
//           email: 'unique@test.com',
//         };

//         await db.insert('companies', companyData);

//         // Try to insert with same slug
//         await expect(
//           db.insert('companies', {
//             id: 'unique-test-2',
//             name: 'Another Company',
//             slug: 'unique-slug', // Duplicate slug
//             email: 'another@test.com',
//           })
//         ).rejects.toThrow();
//       });
//     });

//     describe('Find', () => {
//       let testId1: string;
//       let testId2: string;

//       beforeEach(async () => {
//         // Insert test data with unique IDs and slugs
//         const timestamp = Date.now();
//         testId1 = `find-test-1-${timestamp}`;
//         testId2 = `find-test-2-${timestamp}`;
        
//         await db.insert('companies', {
//           id: testId1,
//           name: 'Find Test 1',
//           slug: `find-test-1-${timestamp}`,
//           email: 'find1@test.com',
//         });

//         await db.insert('companies', {
//           id: testId2,
//           name: 'Find Test 2',
//           slug: `find-test-2-${timestamp}`,
//           email: 'find2@test.com',
//         });
//       });

//       it('should find all records', async () => {
//         const results = await db.find('companies');
//         expect(results.length).toBeGreaterThanOrEqual(2);
//       });

//       it('should find records with where clause', async () => {
//         const results = await db.find('companies', { id: testId1 });
//         expect(results.length).toBe(1);
//         expect(results[0].name).toBe('Find Test 1');
//       });

//       it('should find with limit', async () => {
//         const results = await db.find('companies', {}, { limit: 1 });
//         expect(results.length).toBe(1);
//       });

//       it('should find with orderBy', async () => {
//         const results = await db.find('companies', {}, { orderBy: 'name DESC' });
//         expect(results[0].name).toContain('Test');
//       });
//     });

//     describe('FindOne', () => {
//       beforeEach(async () => {
//         const timestamp = Date.now();
//         await db.insert('companies', {
//           id: 'findone-test',
//           name: 'FindOne Test',
//           slug: `findone-test-${timestamp}`,
//           email: 'findone@test.com',
//         });
//       });

//       it('should find one record', async () => {
//         const result = await db.findOne('companies', { id: 'findone-test' });
//         expect(result).toBeDefined();
//         expect(result?.name).toBe('FindOne Test');
//       });

//       it('should return null when not found', async () => {
//         const result = await db.findOne('companies', { id: 'non-existent' });
//         expect(result).toBeNull();
//       });
//     });

//     describe('Update', () => {
//       beforeEach(async () => {
//         const timestamp = Date.now();
//         await db.insert('companies', {
//           id: 'update-test',
//           name: 'Original Name',
//           slug: `update-test-${timestamp}`,
//           email: 'update@test.com',
//         });
//       });

//       it('should update a record', async () => {
//         const results = await db.update(
//           'companies',
//           { name: 'Updated Name' },
//           { id: 'update-test' }
//         );

//         expect(results.length).toBe(1);
//         expect(results[0].name).toBe('Updated Name');
//       });

//       it('should update multiple fields', async () => {
//         const results = await db.update(
//           'companies',
//           {
//             name: 'New Name',
//             email: 'newemail@test.com',
//           },
//           { id: 'update-test' }
//         );

//         expect(results[0].name).toBe('New Name');
//         expect(results[0].email).toBe('newemail@test.com');
//       });

//       it('should return empty array when no match', async () => {
//         const results = await db.update(
//           'companies',
//           { name: 'Updated' },
//           { id: 'non-existent' }
//         );

//         expect(results.length).toBe(0);
//       });
//     });

//     describe('Delete', () => {
//       beforeEach(async () => {
//         const timestamp = Date.now();
//         await db.insert('companies', {
//           id: 'delete-test',
//           name: 'Delete Test',
//           slug: `delete-test-${timestamp}`,
//           email: 'delete@test.com',
//         });
//       });

//       it('should soft delete a record', async () => {
//         const count = await db.delete('companies', { id: 'delete-test' });
//         expect(count).toBe(1);

//         // Should not find soft-deleted record
//         const result = await db.findOne('companies', { id: 'delete-test' });
//         expect(result).toBeNull();
//       });

//       it('should not affect other records', async () => {
//         const timestamp = Date.now();
//         await db.insert('companies', {
//           id: 'keep-test',
//           name: 'Keep Test',
//           slug: `keep-test-${timestamp}`,
//           email: 'keep@test.com',
//         });

//         await db.delete('companies', { id: 'delete-test' });

//         const result = await db.findOne('companies', { id: 'keep-test' });
//         expect(result).toBeDefined();
//       });
//     });

//     describe('Count', () => {
//       beforeEach(async () => {
//         const timestamp = Date.now();
//         await db.insert('companies', {
//           id: 'count-test-1',
//           name: 'Count Test 1',
//           slug: `count-test-1-${timestamp}`,
//           email: 'count1@test.com',
//         });

//         await db.insert('companies', {
//           id: 'count-test-2',
//           name: 'Count Test 2',
//           slug: `count-test-2-${timestamp}`,
//           email: 'count2@test.com',
//         });
//       });

//       it('should count all records', async () => {
//         const count = await db.count('companies');
//         expect(count).toBeGreaterThanOrEqual(2);
//       });

//       it('should count with where clause', async () => {
//         const count = await db.count('companies', { id: 'count-test-1' });
//         expect(count).toBe(1);
//       });
//     });
//   });

//   describe('Transactions', () => {
//     it('should execute transaction successfully', async () => {
//       const result = await db.transaction(async (txDb) => {
//         const company = await txDb.insert('companies', {
//           id: 'tx-company',
//           name: 'Transaction Company',
//           slug: 'tx-company',
//           email: 'tx@test.com',
//         });

//         const user = await txDb.insert('users', {
//           id: 'tx-user',
//           company_id: 'tx-company',
//           email: 'txuser@test.com',
//           password_hash: 'hash',
//           first_name: 'TX',
//           last_name: 'User',
//           role: 'admin',
//         });

//         return { company, user };
//       });

//       expect(result.company).toBeDefined();
//       expect(result.user).toBeDefined();

//       // Verify data was committed
//       const company = await db.findOne('companies', { id: 'tx-company' });
//       const user = await db.findOne('users', { id: 'tx-user' });

//       expect(company).toBeDefined();
//       expect(user).toBeDefined();
//     });
//   });

//   describe('Query', () => {
//     it('should execute raw SQL query', async () => {
//       await db.insert('companies', {
//         id: 'query-test',
//         name: 'Query Test',
//         slug: 'query-test',
//         email: 'query@test.com',
//       });

//       const result = await db.query(
//         'SELECT * FROM companies WHERE id = ?',
//         ['query-test']
//       );

//       expect(result.rows.length).toBe(1);
//       expect(result.rows[0].name).toBe('Query Test');
//     });

//     it('should handle query errors', async () => {
//       await expect(
//         db.query('SELECT * FROM non_existent_table')
//       ).rejects.toThrow();
//     });
//   });
// });
