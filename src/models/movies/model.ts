import { openDb } from '../../dbController';
import { IGroup, IMovie, IUser, TId } from './types';

export async function createGroup(code: string): Promise<IGroup> {
  const db = await openDb();
  const res = await db.run(`INSERT INTO groups (code) VALUES (?)`, [code]);
  return {
    id: res.lastID as TId,
    code,
  };
}

export async function findGroupByCode(
  code: string,
): Promise<IGroup | undefined> {
  const db = await openDb();
  return db.get(`SELECT * FROM groups WHERE code = ?`, [code]);
}

export async function createUser(): Promise<IUser | undefined> {
  const db = await openDb();
  const res = await db.run(`INSERT OR IGNORE INTO users DEFAULT VALUES`);
  return { id: res.lastID as TId };
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

export async function listMovies(groupId: TId): Promise<IMovie[] | undefined> {
  const db = await openDb();
  return db.all(`SELECT * FROM movies WHERE group_id = ?`, [groupId]);
}

export async function markMovieAsWatched(movieId: TId, groupId: TId) {
  const db = await openDb();
  await db.run(`DELETE FROM movies WHERE id = ? AND group_id = ?`, [
    movieId,
    groupId,
  ]);
}

export async function markMovieAsVetoed(movieId: TId) {
  const db = await openDb();
  await db.run(`UPDATE movies SET is_vetoed = 1 WHERE id = ?`, [movieId]);
}

export async function findUserById(userId: TId): Promise<IUser | undefined> {
  const db = await openDb();
  return db.get(`SELECT * FROM users WHERE id = ?`, [userId]);
}
