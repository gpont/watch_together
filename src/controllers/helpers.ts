import { IMDB_URL, KINOPOISK_URL } from '../consts';
import { IMovie } from '../models';

export const getKinopoiskUrl = (movieId: string) =>
  `${KINOPOISK_URL}${encodeURIComponent(movieId)}`;

export const getImdbUrl = (movieId: string) =>
  `${IMDB_URL}${encodeURIComponent(movieId)}`;

export const getMovieDescription = (movie: IMovie) =>
  `${movie.id}. ${movie.name} (__голоса: ${movie.votes}__) /vote${movie.id}\n` +
  `[Кинопоиск](${movie.kinopoisk_link}) | [IMDB](${movie.imdb_link})\n`;
