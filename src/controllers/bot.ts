// Fix for error: node-telegram-bot-api
// deprecated Automatic enabling of cancellation
// of promises is deprecated In the future
process.env.NTBA_FIX_319 = '1';
import TelegramBot, { SendMessageOptions } from 'node-telegram-bot-api';
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
  markMovieAsVetoed,
  findUserById,
} from '../models';
import texts from '../texts.json';
import { getImdbUrl, getKinopoiskUrl, getMovieDescription } from './helpers';

type THandler = (
  bot: TelegramBot,
) => (msg: TelegramBot.Message, match: string[] | null) => void;

const MSG_OPTIONS: SendMessageOptions = {
  disable_web_page_preview: true,
  parse_mode: 'Markdown',
};

export const botHandlers: [RegExp, THandler][] = [
  [
    /\/start/,
    (bot) => async (msg) => {
      await createUser();
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
    /\/join_group (.*)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;

      if (!match?.[1]) {
        bot.sendMessage(chatId, texts.no_group_code);
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
    /\/suggest (.*)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      if (!match) {
        bot.sendMessage(chatId, texts.no_movie_name);
        return;
      }

      if (!userId) {
        bot.sendMessage(chatId, texts.user_not_found);
        return;
      }

      const movieName = match.slice(1).join(' ');

      const user = await findUserById(userId);
      const groupUser = await findGroupByCode(String(chatId));

      if (!user) {
        bot.sendMessage(chatId, texts.user_not_found);
        return;
      }

      if (!groupUser) {
        bot.sendMessage(chatId, texts.not_in_group);
        return;
      }

      const movie = await suggestMovie(
        movieName,
        user.id,
        groupUser.id,
        getKinopoiskUrl(movieName),
        getImdbUrl(movieName),
      );
      if (!movie) {
        bot.sendMessage(chatId, texts.movie_not_added);
        return;
      }
      bot.sendMessage(
        chatId,
        `${texts.movie_suggested}:\n${getMovieDescription(movie)}`,
        MSG_OPTIONS,
      );
    },
  ],
  [
    /\/vote ?(.*)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;

      if (!match) {
        bot.sendMessage(chatId, texts.movie_not_found);
        return;
      }

      const movieId = parseInt(match.slice(1).join(''), 10);

      const groupUser = await findGroupByCode(String(chatId));
      if (!groupUser) {
        bot.sendMessage(chatId, texts.not_in_group);
        return;
      }
      const movie = await findMovieById(movieId, groupUser.id);

      if (movie) {
        await voteForMovie(movieId);
        bot.sendMessage(chatId, `${texts.voted} "${movie.name}"`);
      } else {
        bot.sendMessage(chatId, texts.movie_not_found);
      }
    },
  ],
  [
    /\/list/,
    (bot) => async (msg) => {
      const chatId = msg.chat.id;

      const groupUser = await findGroupByCode(String(chatId));
      if (!groupUser) {
        bot.sendMessage(chatId, texts.not_in_group);
        return;
      }

      const movies = await listMovies(groupUser.id);

      if (!!movies && movies.length > 0) {
        const movieList =
          texts.movie_list + movies.map(getMovieDescription).join('');
        bot.sendMessage(chatId, movieList, MSG_OPTIONS);
      } else {
        bot.sendMessage(chatId, texts.movie_list_empty);
      }
    },
  ],
  [
    /\/watched (.*)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;

      if (!match?.[1]) {
        bot.sendMessage(chatId, texts.movie_not_found);
        return;
      }

      const movieId = parseInt(match.slice(1).join(''), 10);

      const groupUser = await findGroupByCode(String(chatId));
      if (!groupUser) {
        bot.sendMessage(chatId, texts.not_in_group);
        return;
      }

      const movie = await findMovieById(movieId, groupUser.id);

      if (movie) {
        await markMovieAsWatched(movieId, groupUser.id);
        bot.sendMessage(chatId, `${texts.movie_watched} "${movie.name}"`);
      } else {
        bot.sendMessage(chatId, texts.movie_not_found);
      }
    },
  ],
  [
    /\/veto (.*)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;

      if (!match?.[1]) {
        bot.sendMessage(chatId, texts.movie_not_found);
        return;
      }

      const groupUser = await findGroupByCode(String(chatId));
      if (!groupUser) {
        bot.sendMessage(chatId, texts.not_in_group);
        return;
      }

      const movieId = parseInt(match.slice(1).join(''), 10);
      const movie = await findMovieById(movieId, groupUser.id);

      if (movie) {
        await markMovieAsVetoed(movieId);
        bot.sendMessage(chatId, `${texts.vetoed} "${movie.name}"`);
      } else {
        bot.sendMessage(chatId, texts.movie_not_found);
      }
    },
  ],
  [
    /\/random/,
    (bot) => async (msg) => {
      const chatId = msg.chat.id;

      const groupUser = await findGroupByCode(String(chatId));
      if (!groupUser) {
        bot.sendMessage(chatId, texts.not_in_group);
        return;
      }

      const movies = await listMovies(groupUser.id);

      if (!!movies && movies.length > 0) {
        const movie = movies[Math.floor(Math.random() * movies.length)];
        bot.sendMessage(chatId, getMovieDescription(movie), MSG_OPTIONS);
      } else {
        bot.sendMessage(chatId, texts.movie_list_empty);
      }
    },
  ],
];
