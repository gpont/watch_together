// Fix for error: node-telegram-bot-api
// deprecated Automatic enabling of cancellation
// of promises is deprecated In the future
process.env.NTBA_FIX_319 = '1';
import TelegramBot from 'node-telegram-bot-api';
import {
  createGroup,
  findGroupByCode,
  createUser,
  addUserToGroup,
  suggestMovie,
  findMovieById,
  voteForMovie,
  listMovies,
  markMovieAsWatched,
} from '../models/moviesModel';
import texts from '../texts.json';
import { getKinopoiskUrl } from './helpers';

type THandler = (
  bot: TelegramBot,
) => (msg: TelegramBot.Message, match: string[] | null) => void;

export const botHandlers: [RegExp, THandler][] = [
  [
    /\/start/,
    (bot) => async (msg) => {
      await createUser(msg.chat.id);
      bot.sendMessage(msg.chat.id, texts.start);
    },
  ],
  [
    /\/help/,
    (bot) => (msg) => {
      bot.sendMessage(msg.chat.id, texts.help);
    },
  ],
  [
    /\/create_group/,
    (bot) => async (msg) => {
      const chatId = msg.chat.id;
      await createGroup(String(chatId));
      bot.sendMessage(chatId, `${texts.group_created} ${chatId}`);
    },
  ],
  [
    /\/join_group (.+)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;

      if (match === null) {
        bot.sendMessage(chatId, texts.group_not_found);
        return;
      }

      const userId = msg.from?.id;
      if (!userId) {
        bot.sendMessage(chatId, texts.user_not_found);
        return;
      }

      const groupCode = match.slice(1).join(' ');

      const group = await findGroupByCode(groupCode);
      if (group) {
        await addUserToGroup(group.id, userId);
        bot.sendMessage(chatId, texts.joined_group);
      } else {
        bot.sendMessage(chatId, texts.group_not_found);
      }
    },
  ],
  [
    /\/suggest_movie (.+)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;

      if (match === null) {
        bot.sendMessage(chatId, texts.movie_not_found);
        return;
      }

      const movieName = match.slice(1).join(' ');

      const user = await createUser(chatId);
      const groupUser = await findGroupByCode(String(chatId));

      if (groupUser) {
        const link = getKinopoiskUrl(movieName);
        await suggestMovie(movieName, user.id, groupUser.id, link);
        bot.sendMessage(chatId, `${texts.movie_suggested} "${movieName}"`);
      } else {
        bot.sendMessage(chatId, texts.not_in_group);
      }
    },
  ],
  [
    /\/vote (.+)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;

      if (match === null) {
        bot.sendMessage(chatId, texts.movie_not_found);
        return;
      }

      const movieId = match.slice(1).join(' ');

      const movie = await findMovieById(movieId, chatId);

      if (movie) {
        await voteForMovie(movieId);
        bot.sendMessage(chatId, `${texts.voted} "${movie.name}"`);
      } else {
        bot.sendMessage(chatId, texts.movie_not_found);
      }
    },
  ],
  [
    /\/list_movies/,
    (bot) => async (msg) => {
      const chatId = msg.chat.id;
      const movies = await listMovies();

      if (movies.length > 0) {
        let movieList = texts.movie_list;
        for (const movie of movies) {
          movieList += `${movie.id}. ${movie.name} (голоса: ${movie.votes}) - ${movie.link}\n`;
        }
        bot.sendMessage(chatId, movieList);
      } else {
        bot.sendMessage(chatId, texts.movie_list_empty);
      }
    },
  ],
  [
    /\/watched (.+)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;

      if (match === null) {
        bot.sendMessage(chatId, texts.movie_not_found);
        return;
      }

      const movieId = match.slice(1).join(' ');

      const movie = await findMovieById(movieId, chatId);

      if (movie) {
        await markMovieAsWatched(movieId);
        bot.sendMessage(chatId, `${texts.movie_watched} "${movie.name}"`);
      } else {
        bot.sendMessage(chatId, texts.movie_not_found);
      }
    },
  ],
  [
    /\/veto (.+)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;

      if (match === null) {
        bot.sendMessage(chatId, texts.movie_not_found);
        return;
      }

      const userId = msg.from?.id;
      if (!userId) {
        bot.sendMessage(chatId, texts.user_not_found);
        return;
      }

      const movieId = match.slice(1).join(' ');

      const movie = await findMovieById(movieId, chatId);

      if (movie) {
        if (movie.suggested_by !== userId) {
          await markMovieAsWatched(movieId);
          bot.sendMessage(chatId, `${texts.vetoed} "${movie.name}"`);
        } else {
          bot.sendMessage(chatId, texts.cannot_veto_own);
        }
      } else {
        bot.sendMessage(chatId, texts.movie_not_found);
      }
    },
  ],
];
