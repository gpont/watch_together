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

export async function createUser(username: string): Promise<IUser | undefined> {
  const db = await openDb();
  const res = await db.run(
    `INSERT OR IGNORE INTO users (username) VALUES (?)`,
    [username],
  );
  return { id: res.lastID as TId, username };
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

async function calcMovieVotes(movieId: TId): Promise<number> {
  const db = await openDb();
  const votes = await db.all(
    `SELECT COUNT(*) AS vote_count FROM votes WHERE movie_id = ?`,
    [movieId],
  );
  return votes[0].vote_count ?? 0;
}

export async function hasUserMovieVote(
  userId: TId,
  movieId: TId,
): Promise<boolean> {
  const db = await openDb();
  const res = await db.get(
    `SELECT * FROM votes WHERE movie_id = ? AND user_id = ?`,
    [movieId, userId],
  );
  return !!res;
}

async function mapMovie(
  row?: Omit<IMovie, 'votes'>,
): Promise<IMovie | undefined> {
  return row && { ...row, votes: await calcMovieVotes(row.id) };
}

export async function findMovieById(
  movieId: TId,
  groupId: TId,
): Promise<IMovie | undefined> {
  const db = await openDb();
  return db
    .get(`SELECT * FROM movies WHERE id = ? AND group_id = ?`, [
      movieId,
      groupId,
    ])
    .then(mapMovie);
}

export async function voteForMovie(movieId: TId, userId: TId) {
  const db = await openDb();
  await db.run(`INSERT INTO votes (movie_id, user_id) VALUES (?, ?)`, [
    movieId,
    userId,
  ]);
}

export async function listMovies(groupId: TId): Promise<IMovie[] | undefined> {
  const db = await openDb();
  return db
    .all(`SELECT * FROM movies WHERE group_id = ?`, [groupId])
    .then((rows: (Omit<IMovie, 'votes'> | undefined)[]) =>
      Promise.all(rows.map(mapMovie)),
    )
    .then((movies: (IMovie | undefined)[]) =>
      movies.filter((row): row is IMovie => !!row),
    );
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

export async function findUserByUsername(
  username: string,
): Promise<IUser | undefined> {
  const db = await openDb();
  return db.get(`SELECT * FROM users WHERE username = ?`, [username]);
}
