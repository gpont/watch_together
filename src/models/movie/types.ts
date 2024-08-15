import { TId } from '../types';

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
