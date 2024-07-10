import { openDb } from './database';

export async function createGroup(code: string, dbName?: string) {
  const db = await openDb(dbName);
  await db.run(`INSERT INTO groups (code) VALUES (?)`, [code]);
}

export async function findGroupByCode(code: string, dbName?: string) {
  const db = await openDb(dbName);
  return db.get(`SELECT id FROM groups WHERE code = ?`, [code]);
}

export async function createUser(telegramId: number, dbName?: string) {
  const db = await openDb(dbName);
  await db.run(`INSERT OR IGNORE INTO users (telegram_id) VALUES (?)`, [
    telegramId,
  ]);
}

export async function findUserByTelegramId(
  telegramId: number,
  dbName?: string,
) {
  const db = await openDb(dbName);
  return db.get(`SELECT id FROM users WHERE telegram_id = ?`, [telegramId]);
}

export async function addUserToGroup(
  groupId: number,
  userId: number,
  dbName?: string,
) {
  const db = await openDb(dbName);
  await db.run(`INSERT INTO group_users (group_id, user_id) VALUES (?, ?)`, [
    groupId,
    userId,
  ]);
}

export async function suggestMovie(
  name: string,
  suggestedBy: number,
  groupId: number,
  link: string,
  dbName?: string,
) {
  const db = await openDb(dbName);
  await db.run(
    `INSERT INTO movies (name, suggested_by, group_id, link) VALUES (?, ?, ?, ?)`,
    [name, suggestedBy, groupId, link],
  );
}

export async function findMovieById(movieId: string, dbName?: string) {
  const db = await openDb(dbName);
  return db.get(`SELECT * FROM movies WHERE id = ?`, [movieId]);
}

export async function voteForMovie(movieId: string, dbName?: string) {
  const db = await openDb(dbName);
  await db.run(`UPDATE movies SET votes = votes + 1 WHERE id = ?`, [movieId]);
}

export async function listMovies(dbName?: string) {
  const db = await openDb(dbName);
  return db.all(`SELECT id, name, suggested_by, votes, link FROM movies`);
}

export async function markMovieAsWatched(movieId: string, dbName?: string) {
  const db = await openDb(dbName);
  await db.run(`DELETE FROM movies WHERE id = ?`, [movieId]);
}

export async function findUserById(userId: number, dbName?: string) {
  const db = await openDb(dbName);
  return db.get(`SELECT id FROM users WHERE id = ?`, [userId]);
}
