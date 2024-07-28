import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { DATABASE_FILENAME } from '../consts';

export async function openDb() {
  return open({
    filename: DATABASE_FILENAME,
    driver: sqlite3.Database,
  });
}

export async function initializeDb() {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      suggested_by INTEGER,
      votes INTEGER DEFAULT 0,
      kinopoisk_link TEXT,
      imdb_link TEXT,
      group_id INTEGER,
      FOREIGN KEY (suggested_by) REFERENCES users(id),
      FOREIGN KEY (group_id) REFERENCES groups(id)
    );
    CREATE TABLE IF NOT EXISTS group_users (
      group_id INTEGER,
      user_id INTEGER,
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}
