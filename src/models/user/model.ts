import { openDb } from '../../dbController';
import { TId } from '../types';
import { IUser } from './types';

export async function createUser(username: string): Promise<IUser | undefined> {
  const db = await openDb();
  const res = await db.run(
    `INSERT OR IGNORE INTO users (username) VALUES (?)`,
    [username],
  );
  return { id: res.lastID as TId, username };
}

export async function findUserByUsername(
  username: string,
): Promise<IUser | undefined> {
  const db = await openDb();
  return db.get(`SELECT * FROM users WHERE username = ?`, [username]);
}
