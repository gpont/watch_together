export type TId = number;

export interface IGroup {
  id: TId;
  code: string;
}

export interface IUser {
  id: TId;
  group_id: number;
}

export interface IMovie {
  id: TId;
  name: string;
  suggested_by: TId;
  votes: number;
  kinopoisk_link: string;
  imdb_link: string;
  group_id: TId;
}
