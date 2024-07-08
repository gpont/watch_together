import { openDb, initializeDb } from '../models/database';

describe('Database Tests', () => {
  beforeAll(async () => {
    await initializeDb();
  });

  test('should insert and retrieve group', async () => {
    const db = await openDb();
    await db.run(`INSERT INTO groups (code) VALUES ('test_code')`);
    const group = await db.get(`SELECT * FROM groups WHERE code = 'test_code'`);
    expect(group.code).toBe('test_code');
  });

  test('should insert and retrieve user', async () => {
    const db = await openDb();
    await db.run(`INSERT INTO users (telegram_id) VALUES (123456)`);
    const user = await db.get(`SELECT * FROM users WHERE telegram_id = 123456`);
    expect(user.telegram_id).toBe(123456);
  });

  test('should insert and retrieve movie', async () => {
    const db = await openDb();
    await db.run(`INSERT INTO movies (name, suggested_by, group_id, link) VALUES ('Test Movie', 1, 1, 'http://example.com')`);
    const movie = await db.get(`SELECT * FROM movies WHERE name = 'Test Movie'`);
    expect(movie.name).toBe('Test Movie');
    expect(movie.link).toBe('http://example.com');
  });
});
