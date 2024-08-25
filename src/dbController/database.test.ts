import fs from 'fs';
import { openDb, initializeDb, listAllTablesData } from './database';

const DATABASE_FILENAME = './db/test_database.db';

jest.mock('../consts.ts', () => ({
  DATABASE_FILENAME: './db/test_database.db',
}));

describe('Database Tests', () => {
  beforeAll(async () => {
    await initializeDb();
  });

  afterAll(async () => {
    fs.rmSync(DATABASE_FILENAME);
  });

  describe('Tables creation and data insertion', () => {
    it('should insert and retrieve group', async () => {
      const db = await openDb();
      await db.run(`INSERT INTO groups (code) VALUES ('test_code')`);
      const group = await db.get(
        `SELECT * FROM groups WHERE code = 'test_code'`,
      );
      expect(group.code).toBe('test_code');
    });

    it('should insert and retrieve user', async () => {
      const db = await openDb();
      const res = await db.run(`INSERT INTO users DEFAULT VALUES`);
      const user = await db.get(`SELECT * FROM users WHERE id = ?`, [
        res.lastID as number,
      ]);
      expect(user.id).toBe(res.lastID as number);
    });

    it('should insert and retrieve movie', async () => {
      const db = await openDb();
      await db.run(
        `INSERT INTO movies (name, suggested_by, group_id, kinopoisk_link, imdb_link) VALUES ('Test Movie', 1, 1, 'http://example1.com', 'http://example2.com')`,
      );
      const movie = await db.get(
        `SELECT * FROM movies WHERE name = 'Test Movie'`,
      );
      expect(movie.name).toBe('Test Movie');
      expect(movie.kinopoisk_link).toBe('http://example1.com');
      expect(movie.imdb_link).toBe('http://example2.com');
    });
  });

  describe('List all tables data', () => {
    it('should return all tables data', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => undefined);
      await listAllTablesData();
      expect(console.log).toBeCalledTimes(1);
    });
  });
});
