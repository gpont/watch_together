export type TId = number;

export interface IGroup {
  id: TId;
  code: string;
}

export interface IUser {
  id: TId;
}

export interface IMovie {
  id: TId;
  name: string;
  suggested_by: TId;
  votes: number;
  is_vetoed: boolean;
  kinopoisk_link: string;
  imdb_link: string;
  group_id: TId;
}
