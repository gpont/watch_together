import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function openDb(filename = './database.db') {
  return open({
    filename,
    driver: sqlite3.Database,
  });
}

export async function initializeDb(filename = './database.db') {
  const db = await openDb(filename);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE
    );
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      suggested_by INTEGER,
      votes INTEGER DEFAULT 0,
      link TEXT,
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
