// Fix for error: node-telegram-bot-api
// deprecated Automatic enabling of cancellation
// of promises is deprecated In the future
process.env.NTBA_FIX_319 = '1';
import { SendMessageOptions } from 'node-telegram-bot-api';
import {
  createGroup,
  findGroupByCode,
  createUser,
  addUserToGroup,
  suggestMovie,
  voteForMovie,
  markMovieAsWatched,
  markMovieAsVetoed,
  hasUserMovieVote,
  findUserByUsername,
} from '../models';
import texts from '../texts.json';
import { getImdbUrl, getKinopoiskUrl, getMovieDescription } from './helpers';
import {
  applyMiddlewares,
  CheckError,
  handleCheckErrors,
  logger,
  TRule,
} from '../middlewares';
import {
  checkAndGetArg,
  checkAndGetGroup,
  checkAndGetMovie,
  checkAndGetUserByUsername,
  checkAndGetMoviesList,
} from './checkers';

const MSG_OPTIONS: SendMessageOptions = {
  disable_web_page_preview: true,
  parse_mode: 'Markdown',
};

const rawBotHandlers: TRule[] = [
  [
    /\/start/,
    (bot) => async (msg) => {
      const username = msg.from?.username;

      const user = await findUserByUsername(username ?? '');
      if (!user) {
        await createUser(msg.from?.username ?? '');
      }

      bot.sendMessage(msg.chat.id, texts.start);
    },
  ],
  [
    /\/help/,
    (bot) => async (msg) => {
      bot.sendMessage(msg.chat.id, texts.help);
    },
  ],
  [
    /\/create_group/,
    (bot) => async (msg) => {
      const chatId = msg.chat.id;
      const group = await findGroupByCode(String(chatId));
      if (group) {
        bot.sendMessage(chatId, texts.group_already_created + group.code);
        return;
      }
      await createGroup(String(chatId));
      bot.sendMessage(chatId, `${texts.group_created} ${chatId}`);
    },
  ],
  [
    /\/join_group (.*)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;
      const groupCode = checkAndGetArg(match, texts.no_group_code);
      const user = await checkAndGetUserByUsername(msg);

      const group = await findGroupByCode(groupCode);
      if (!group) {
        bot.sendMessage(chatId, texts.group_not_found);
        return;
      }
      await addUserToGroup(group.id, user.id);
      bot.sendMessage(chatId, texts.joined_group);
    },
  ],
  [
    /\/suggest (.*)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;
      const movieName = checkAndGetArg(match, texts.no_movie_name);

      const user = await checkAndGetUserByUsername(msg);
      const group = await checkAndGetGroup(msg);

      const movie = await suggestMovie(
        movieName,
        user.id,
        group.id,
        getKinopoiskUrl(movieName),
        getImdbUrl(movieName),
      );
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
      const movieId = parseInt(
        checkAndGetArg(match, texts.movie_not_found),
        10,
      );

      const user = await checkAndGetUserByUsername(msg);
      const group = await checkAndGetGroup(msg);
      const movie = await checkAndGetMovie(movieId, group.id);

      if (await hasUserMovieVote(user.id, movieId)) {
        bot.sendMessage(chatId, texts.already_voted);
        return;
      }

      await voteForMovie(movieId, user.id);
      bot.sendMessage(chatId, `${texts.voted} "${movie.name}"`);
    },
  ],
  [
    /\/list/,
    (bot) => async (msg) => {
      const chatId = msg.chat.id;

      const group = await checkAndGetGroup(msg);
      const movies = await checkAndGetMoviesList(group.id);

      const movieList =
        texts.movie_list + movies.map(getMovieDescription).join('');
      bot.sendMessage(chatId, movieList, MSG_OPTIONS);
    },
  ],
  [
    /\/watched (.*)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;
      const movieId = parseInt(
        checkAndGetArg(match, texts.movie_not_found),
        10,
      );

      const group = await checkAndGetGroup(msg);
      const movie = await checkAndGetMovie(movieId, group.id);

      await markMovieAsWatched(movieId, group.id);
      bot.sendMessage(chatId, `${texts.movie_watched} "${movie.name}"`);
    },
  ],
  [
    /\/veto (.*)/,
    (bot) => async (msg, match) => {
      const chatId = msg.chat.id;
      const movieId = parseInt(
        checkAndGetArg(match, texts.movie_not_found),
        10,
      );

      const group = await checkAndGetGroup(msg);
      const movie = await checkAndGetMovie(movieId, group.id);

      await markMovieAsVetoed(movieId);
      bot.sendMessage(chatId, `${texts.vetoed} "${movie.name}"`);
    },
  ],
  [
    /\/random/,
    (bot) => async (msg) => {
      const chatId = msg.chat.id;

      const group = await checkAndGetGroup(msg);
      const movies = (await checkAndGetMoviesList(group.id)).filter(
        (movie) => !movie.is_vetoed,
      );

      const movie = movies[Math.floor(Math.random() * movies.length)];
      bot.sendMessage(chatId, getMovieDescription(movie), MSG_OPTIONS);
    },
  ],
];

export const botHandlers = applyMiddlewares(rawBotHandlers, [
  logger,
  handleCheckErrors,
]);
