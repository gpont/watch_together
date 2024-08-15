import { openDb } from '../../dbController';
import { TId } from '../types';
import { IGroup } from './types';

export async function createGroup(code: string): Promise<IGroup> {
  const db = await openDb();
  const res = await db.run(`INSERT INTO groups (code) VALUES (?)`, [code]);
  return {
    id: res.lastID,
    code,
  } as IGroup;
}

export async function findGroupByCode(
  code: string,
): Promise<IGroup | undefined> {
  const db = await openDb();
  return db.get(`SELECT * FROM groups WHERE code = ?`, [code]);
}

export async function addUserToGroup(groupId: TId, userId: TId) {
  const db = await openDb();
  await db.run(`INSERT INTO group_users (group_id, user_id) VALUES (?, ?)`, [
    groupId,
    userId,
  ]);
}
