import { openDb } from '../../dbController';
import { UId } from '../types';
import { IUser } from './types';

export async function createUser(
  username: string,
  uid: UId,
): Promise<IUser | undefined> {
  const db = await openDb();
  await db.run(`INSERT OR IGNORE INTO users (username, uid) VALUES (?, ?)`, [
    username,
    uid,
  ]);
  return await db.get(`SELECT * FROM users WHERE uid = ?`, [uid]);
}

export async function findUserByUsername(
  username: string,
): Promise<IUser | undefined> {
  const db = await openDb();
  return db.get(`SELECT * FROM users WHERE username = ?`, [username]);
}

export async function getUserByUid(uid: UId): Promise<IUser | undefined> {
  const db = await openDb();
  return db.get(`SELECT * FROM users WHERE uid =?`, [uid]);
}
