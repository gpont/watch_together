import TelegramBot from 'node-telegram-bot-api';
import {
  createGroup,
  findGroupByCode,
  createUser,
  findUserByTelegramId,
  addUserToGroup,
  suggestMovie,
  findMovieById,
  voteForMovie,
  listMovies,
  markMovieAsWatched,
} from '../models/moviesModel';
import texts from '../texts.json';

type THandler = (
  bot: TelegramBot,
) => (msg: TelegramBot.Message, match: string[] | null) => void;

export const botHandlers: [RegExp, THandler][] = [
  [
    /\/start/,
    (bot) => (msg) => {
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

      const groupCode = match[1];

      const group = await findGroupByCode(groupCode);
      if (group) {
        await createUser(chatId);
        const user = await findUserByTelegramId(chatId);
        await addUserToGroup(group.id, user.id);
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

      const movieName = match[1];

      await createUser(chatId);
      const user = await findUserByTelegramId(chatId);
      const groupUser = await findGroupByCode(String(chatId));

      if (groupUser) {
        const link = `https://www.kinopoisk.ru/index.php?kp_query=${encodeURIComponent(
          movieName,
        )}`;
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

      const movieId = match[1];

      const movie = await findMovieById(movieId);

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

      const movieId = match[1];

      const movie = await findMovieById(movieId);

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

      const movieId = match[1];

      const movie = await findMovieById(movieId);

      if (movie) {
        const user = await findUserByTelegramId(chatId);
        if (movie.suggested_by !== user.id) {
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
