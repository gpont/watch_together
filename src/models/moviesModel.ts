import { openDb } from './database';
import { IGroup, IMovie, IUser, TId } from './moviesTypes';

export async function createGroup(code: string) {
  const db = await openDb();
  await db.run(`INSERT INTO groups (code) VALUES (?)`, [code]);
}

export async function findGroupByCode(
  code: string,
): Promise<IGroup | undefined> {
  const db = await openDb();
  return db.get(`SELECT * FROM groups WHERE code = ?`, [code]);
}

export async function createUser(groupId: TId): Promise<IUser | undefined> {
  const db = await openDb();
  const res = await db.run(
    `INSERT OR IGNORE INTO users (group_id) VALUES (?)`,
    [groupId],
  );
  if (!res.lastID) {
    throw new Error(`Failed to create user. groupId: ${groupId}`);
  }
  return findUserById(res.lastID);
}

export async function addUserToGroup(groupId: TId, userId: TId) {
  const db = await openDb();
  await db.run(`INSERT INTO group_users (group_id, user_id) VALUES (?, ?)`, [
    groupId,
    userId,
  ]);
}

export async function suggestMovie(
  name: string,
  suggestedBy: number,
  groupId: TId,
  kinopoiskLink: string,
  imdbLink: string,
): Promise<IMovie | undefined> {
  const db = await openDb();
  const res = await db.run(
    `INSERT INTO movies (name, suggested_by, group_id, kinopoisk_link, imdb_link) VALUES (?, ?, ?, ?, ?)`,
    [name, suggestedBy, groupId, kinopoiskLink, imdbLink],
  );
  return res?.lastID !== undefined
    ? findMovieById(res.lastID, groupId)
    : undefined;
}

export async function findMovieById(
  movieId: TId,
  groupId: TId,
): Promise<IMovie | undefined> {
  const db = await openDb();
  return db.get(`SELECT * FROM movies WHERE id = ? AND group_id = ?`, [
    movieId,
    groupId,
  ]);
}

export async function voteForMovie(movieId: TId) {
  const db = await openDb();
  await db.run(`UPDATE movies SET votes = votes + 1 WHERE id = ?`, [movieId]);
}

export async function listMovies(): Promise<IMovie[] | undefined> {
  const db = await openDb();
  return db.all(
    `SELECT id, name, suggested_by, votes, kinopoisk_link, imdb_link FROM movies`,
  );
}

export async function markMovieAsWatched(movieId: TId) {
  const db = await openDb();
  await db.run(`DELETE FROM movies WHERE id = ?`, [movieId]);
}

export async function findUserById(userId: TId): Promise<IUser | undefined> {
  const db = await openDb();
  return db.get(`SELECT * FROM users WHERE id = ?`, [userId]);
}
