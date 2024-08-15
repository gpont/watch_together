// Fix for error: node-telegram-bot-api
// deprecated Automatic enabling of cancellation
// of promises is deprecated In the future
process.env.NTBA_FIX_319 = '1';
import TelegramBot from 'node-telegram-bot-api';
import texts from '../texts.json';
import { CheckError } from '../middlewares/errorHandler';
import {
  findGroupByUserId,
  findMovieById,
  findUserByUsername,
  IGroup,
  IMovie,
  IUser,
  listMovies,
} from '../models';

export const checkAndGetUserByUsername = async (
  msg: TelegramBot.Message,
): Promise<IUser> => {
  const username = msg.from?.username;

  if (!username) {
    throw new CheckError(texts.user_not_found);
  }
  const user = await findUserByUsername(username);
  if (!user) {
    throw new CheckError(texts.user_not_found);
  }
  return user;
};

export const checkAndGetGroup = async (
  msg: TelegramBot.Message,
): Promise<IGroup> => {
  const user = await checkAndGetUserByUsername(msg);
  const group = await findGroupByUserId(user.id);

  if (!group) {
    throw new CheckError(texts.not_in_group);
  }
  return group;
};

export const checkAndGetArg = (
  match: string[] | null,
  errorText: string,
): string => {
  if (!match?.[1]) {
    throw new CheckError(errorText);
  }
  return match.slice(1).join(' ');
};

export const checkAndGetMovie = async (
  movieId: number,
  groupId: number,
): Promise<IMovie> => {
  const movie = await findMovieById(movieId, groupId);

  if (!movie) {
    throw new CheckError(texts.movie_not_found);
  }
  return movie;
};

export const checkAndGetMoviesList = async (
  groupId: number,
): Promise<IMovie[]> => {
  const movies = await listMovies(groupId);
  if (!movies || movies.length === 0) {
    throw new CheckError(texts.movie_list_empty);
  }

  return movies;
};
