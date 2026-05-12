import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { turso, initializeDatabase } from './turso';

describe('Turso DB', () => {
	beforeAll(async () => {
		// Initialize the database with schema
		await initializeDatabase();
	});

	it('should connect to local db and execute a query', async () => {
		// Verify connection by selecting 1
		const result = await turso.execute('SELECT 1 as val');
		expect(result.rows).toBeDefined();
		expect(result.rows.length).toBeGreaterThan(0);
		expect(result.rows[0].val).toBe(1);
	});

	it('should allow inserting and querying a user', async () => {
		const testUsername = 'test_user_' + Date.now();
		const testEmail = 'test@example.com';
		const now = new Date().toISOString();

		// Insert a dummy user
		await turso.execute({
			sql: `INSERT INTO users (username, email, created_at, updated_at) VALUES (?, ?, ?, ?)`,
			args: [testUsername, testEmail, now, now]
		});

		// Select the inserted user
		const result = await turso.execute({
			sql: `SELECT * FROM users WHERE username = ?`,
			args: [testUsername]
		});

		expect(result.rows.length).toBe(1);
		expect(result.rows[0].username).toBe(testUsername);
		expect(result.rows[0].email).toBe(testEmail);
		
		// Clean up the dummy user
		await turso.execute({
			sql: `DELETE FROM users WHERE username = ?`,
			args: [testUsername]
		});
	});
});
