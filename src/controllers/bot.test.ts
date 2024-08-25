import fs from 'fs';
// Fix for error: node-telegram-bot-api
// deprecated Automatic enabling of cancellation
// of promises is deprecated In the future
process.env.NTBA_FIX_319 = '1';
import TelegramBot, { User } from 'node-telegram-bot-api';
import {
  suggestMovie,
  findMovieById,
  listMovies,
  findGroupByUserId,
  getUserByUid,
} from '../models';
import { initializeDb } from '../dbController';
import { botHandlers } from './bot';
import { createCreateChat, createEmit } from '../lib/testUtils';
import { createSetupChat, TSetupChat } from '../lib/setupChat';

const DATABASE_FILENAME = './db/test_database.db';

jest.mock('node-telegram-bot-api');
jest.mock('../consts.ts', () => ({
  DATABASE_FILENAME: './db/test_database.db',
  KINOPOISK_URL: 'https://www.kinopoisk.ru/index.php?kp_query=',
  IMDB_URL: 'https://www.imdb.com/find/?q=',
}));

describe('Bot Commands', () => {
  let bot: TelegramBot;
  let emitMsg: (msg: TelegramBot.Message) => Promise<void>;
  let setupChat: TSetupChat;
  let createChat: () => number;

  beforeAll(async () => {
    await initializeDb();
    createChat = createCreateChat();
  });

  beforeEach(() => {
    bot = new TelegramBot('test_token', { polling: true });
    emitMsg = createEmit(botHandlers, bot);
    setupChat = createSetupChat(bot, createChat);
  });

  afterAll(async () => {
    fs.rmSync(DATABASE_FILENAME);
    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should send welcome message and create a user', async () => {
      const { sendMessage, msg, chatId } = await setupChat('/start', {
        createUser: false,
        createGroup: false,
      });

      await emitMsg({
        ...msg,
        from: { username: 'test_user', id: chatId } as User,
      });

      const user = await getUserByUid(chatId);

      expect(user).not.toBeUndefined();
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Привет!'),
      );
    });
  });

  describe('help', () => {
    it('should send help message', async () => {
      const { sendMessage, msg } = await setupChat('/help', {
        createUser: false,
        createGroup: false,
      });

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Список команд'),
      );
    });
  });

  describe('create_group', () => {
    it('should create a new group', async () => {
      const { sendMessage, msg, user } = await setupChat('/create_group', {
        createGroup: false,
      });

      await emitMsg(msg);

      const group = await findGroupByUserId(user.id);
      expect(group).not.toBeNull();
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining(`Группа создана! Код для присоединения:`),
      );
    });

    it('should error with existing group', async () => {
      const { sendMessage, msg } = await setupChat('/create_group');

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Группа уже создана'),
      );
    });
  });

  describe('join_group', () => {
    it('should add user to the group', async () => {
      const { sendMessage, msg, group } = await setupChat('/join_group', {
        addUserToGroup: false,
      });

      await emitMsg({ ...msg, text: `/join_group ${group.code}` });

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы присоединились к группе!'),
      );
    });

    it('should error without group code', async () => {
      const { sendMessage, msg } = await setupChat('/join_group ', {
        addUserToGroup: false,
      });

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Код группы не указан'),
      );
    });

    it('should error without user', async () => {
      const { sendMessage, msg, group } = await setupChat('/join_group code', {
        createUser: false,
      });

      await emitMsg({ ...msg, text: `/join_group ${group.code}` });

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Пользователь не найден'),
      );
    });

    it('should error with wrong group code', async () => {
      const { sendMessage, msg } = await setupChat('/join_group 9999', {
        addUserToGroup: false,
      });

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Группа с таким кодом не найдена'),
      );
    });
  });

  describe('leave_group', () => {
    it('should remove user from the group', async () => {
      const { sendMessage, msg, user } = await setupChat('/leave_group');

      await emitMsg(msg);

      const userGroup = await findGroupByUserId(user.id);

      expect(userGroup).toBeUndefined();
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы покинули группу'),
      );
    });
  });

  describe('suggest', () => {
    it('should suggest a movie', async () => {
      const { sendMessage, msg, group } = await setupChat('/suggest Inception');

      await emitMsg(msg);

      const movies = await listMovies(group.id);
      expect(movies?.[0]?.name).toBe('Inception');
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм предложен'),
        expect.objectContaining({}),
      );
    });

    it('should error if no user', async () => {
      const { sendMessage, msg } = await setupChat('/suggest Inception', {
        createUser: false,
      });

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Пользователь не найден'),
      );
    });

    it('should error if no movie name', async () => {
      const { sendMessage, msg, group } = await setupChat('/suggest ');

      await emitMsg(msg);

      const movies = await listMovies(group.id);
      expect(movies?.length).toBe(0);
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Название фильма не указано'),
      );
    });
  });

  describe('vote', () => {
    it('should vote for a movie', async () => {
      const { sendMessage, msg, group, user } = await setupChat('/vote 1');
      const insertedMovie = await suggestMovie(
        'Inception',
        user.id,
        group.id,
        'https://www.kinopoisk.ru/index.php?kp_query=Inception',
        'https://www.imdb.com/find/?q=Inception',
      );

      await emitMsg({
        ...msg,
        text: `/vote ${insertedMovie?.id}`,
      });

      const movie = await findMovieById(insertedMovie?.id ?? 0, group.id);

      expect(movie?.votes).toBe(1);
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы проголосовали за фильм'),
      );
    });

    it('should not vote for a movie 2 times', async () => {
      const { sendMessage, msg, group, user } = await setupChat('/vote 1');
      const insertedMovie = await suggestMovie(
        'Inception',
        user.id,
        group.id,
        'https://www.kinopoisk.ru/index.php?kp_query=Inception',
        'https://www.imdb.com/find/?q=Inception',
      );

      await emitMsg({
        ...msg,
        text: `/vote ${insertedMovie?.id}`,
      });
      await emitMsg({
        ...msg,
        text: `/vote ${insertedMovie?.id}`,
      });

      const movie = await findMovieById(insertedMovie?.id ?? 0, group.id);

      expect(movie?.votes).toBe(1);
      expect(sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should error without movie code', async () => {
      const { sendMessage, msg } = await setupChat('/vote');

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм с таким номером не найден'),
      );
    });

    it('should error with wrong movie code', async () => {
      const { sendMessage, msg } = await setupChat('/vote qwe');

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм с таким номером не найден'),
      );
    });
  });

  describe('list', () => {
    it('should print current list of movies', async () => {
      const { sendMessage, msg, user, group } = await setupChat('/list');
      const movie = await suggestMovie(
        'Inception',
        user.id,
        group.id,
        'https://www.kinopoisk.ru/index.php?kp_query=Inception',
        'https://www.imdb.com/find/?q=Inception',
      );

      await emitMsg(msg);
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining(movie?.name ?? 'Inception'),
        expect.objectContaining({}),
      );
    });

    it('should error if user not in group', async () => {
      const { sendMessage, msg } = await setupChat('/list', {
        addUserToGroup: false,
      });

      await emitMsg(msg);
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы не состоите ни в одной группе'),
      );
    });
  });

  describe('watched', () => {
    it('should delete a movie from the list', async () => {
      const { sendMessage, msg, user, group } = await setupChat('/watched 1');
      const insertedMovie = await suggestMovie(
        'Inception',
        user.id,
        group.id,
        'https://www.kinopoisk.ru/index.php?kp_query=Inception',
        'https://www.imdb.com/find/?q=Inception',
      );

      await emitMsg({
        ...msg,
        text: `/watched ${insertedMovie.id}`,
      });

      const movie = await findMovieById(insertedMovie.id, group.id);
      expect(movie).toBeUndefined();
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining(
          'Фильм отмечен как просмотренный и удален из списка',
        ),
      );
    });

    it('should error if no movie id', async () => {
      const { sendMessage, msg } = await setupChat('/watched ');

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм с таким номером не найден'),
      );
    });

    it('should error if user not in group', async () => {
      const { sendMessage, msg } = await setupChat('/watched 9998', {
        createGroup: false,
        addUserToGroup: false,
      });

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы не состоите ни в одной группе'),
      );
    });

    it('should error if wrong movie code', async () => {
      const { sendMessage, msg } = await setupChat('/watched 9999');

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм с таким номером не найден'),
      );
    });
  });

  describe('veto', () => {
    it('veto command should veto a movie', async () => {
      const { sendMessage, msg, user, group } = await setupChat('/veto 1');
      const insertedMovie = await suggestMovie(
        'Inception',
        user.id,
        group.id,
        'https://www.kinopoisk.ru/index.php?kp_query=Inception',
        'https://www.imdb.com/find/?q=Inception',
      );

      await emitMsg({
        ...msg,
        text: `/veto ${insertedMovie.id}`,
      });

      const movie = await findMovieById(insertedMovie.id, group.id);

      expect(movie?.is_vetoed).toBe(1);
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм удален'),
      );
    });

    it('should error if no movie id', async () => {
      const { sendMessage, msg } = await setupChat('/veto ', {
        createGroup: false,
        addUserToGroup: false,
      });

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм с таким номером не найден'),
      );
    });

    it('should error if wrong movie code', async () => {
      const { sendMessage, msg } = await setupChat('/veto 9999');

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм с таким номером не найден'),
      );
    });
  });

  describe('random', () => {
    it('should send a random movie', async () => {
      const { sendMessage, msg, user, group } = await setupChat('/random');
      await suggestMovie(
        'Inception',
        user.id,
        group.id,
        'https://www.kinopoisk.ru/index.php?kp_query=Inception',
        'https://www.imdb.com/find/?q=Inception',
      );

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining(''),
        expect.objectContaining({}),
      );
    });

    it('should error if user not in group', async () => {
      const { sendMessage, msg } = await setupChat('/random', {
        createGroup: false,
        addUserToGroup: false,
      });

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы не состоите ни в одной группе'),
      );
    });

    it('should error if list is empty', async () => {
      const { sendMessage, msg } = await setupChat('/random');

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Список фильмов пуст'),
      );
    });
  });
});
