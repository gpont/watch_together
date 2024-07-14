import { KINOPOISK_URL } from '../consts';

export const getKinopoiskUrl = (movieId: string) =>
  `${KINOPOISK_URL}${encodeURIComponent(movieId)}`;
