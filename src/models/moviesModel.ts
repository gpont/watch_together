import { openDb } from './database';

export async function createGroup(code: string) {
  const db = await openDb();
  await db.run(`INSERT INTO groups (code) VALUES (?)`, [code]);
}

export async function findGroupByCode(code: string) {
  const db = await openDb();
  return db.get(`SELECT id FROM groups WHERE code = ?`, [code]);
}

export async function createUser(telegramId: number) {
  const db = await openDb();
  await db.run(`INSERT OR IGNORE INTO users (telegram_id) VALUES (?)`, [
    telegramId,
  ]);
}

export async function findUserByTelegramId(telegramId: number) {
  const db = await openDb();
  return db.get(`SELECT id FROM users WHERE telegram_id = ?`, [telegramId]);
}

export async function addUserToGroup(groupId: number, userId: number) {
  const db = await openDb();
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
) {
  const db = await openDb();
  await db.run(
    `INSERT INTO movies (name, suggested_by, group_id, link) VALUES (?, ?, ?, ?)`,
    [name, suggestedBy, groupId, link],
  );
}

export async function findMovieById(movieId: string) {
  const db = await openDb();
  return db.get(`SELECT * FROM movies WHERE id = ?`, [movieId]);
}

export async function voteForMovie(movieId: string) {
  const db = await openDb();
  await db.run(`UPDATE movies SET votes = votes + 1 WHERE id = ?`, [movieId]);
}

export async function listMovies() {
  const db = await openDb();
  return db.all(`SELECT id, name, suggested_by, votes, link FROM movies`);
}

export async function markMovieAsWatched(movieId: string) {
  const db = await openDb();
  await db.run(`DELETE FROM movies WHERE id = ?`, [movieId]);
}

export async function findUserById(userId: number) {
  const db = await openDb();
  return db.get(`SELECT id FROM users WHERE id = ?`, [userId]);
}
