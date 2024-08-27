import { openDb } from '../../dbController';
import { TId } from '../types';
import { IGroup } from './types';

export async function createGroup(): Promise<IGroup> {
  const code = Math.random().toString().substr(2, 7);
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

export async function findGroupByUserId(
  userId: TId,
): Promise<IGroup | undefined> {
  const db = await openDb();
  return db.get(
    `SELECT g.* FROM groups g JOIN group_users gu ON g.id = gu.group_id WHERE gu.user_id =?`,
    [userId],
  );
}

export async function addUserToGroup(groupId: TId, userId: TId) {
  const db = await openDb();
  await db.run(`INSERT INTO group_users (group_id, user_id) VALUES (?, ?)`, [
    groupId,
    userId,
  ]);
}

export async function removeUserFromGroup(groupId: TId, userId: TId) {
  const db = await openDb();
  await db.run('DELETE FROM group_users WHERE user_id =? AND group_id =?', [
    userId,
    groupId,
  ]);
}
