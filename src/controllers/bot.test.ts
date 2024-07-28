import fs from 'fs';
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
  findUserById,
} from '../models';
import { initializeDb } from '../dbController';
import { botHandlers } from './bot';

const DATABASE_FILENAME = './test_database.db';

jest.mock('node-telegram-bot-api');
jest.mock('../consts.ts', () => ({
  DATABASE_FILENAME: './test_database.db',
  KINOPOISK_URL: 'https://www.kinopoisk.ru/index.php?kp_query=',
  IMDB_URL: 'https://www.imdb.com/find/?q=',
}));

describe('Bot Commands', () => {
  let bot: TelegramBot;
  let chatId = 0;
  const emitMsg = async (msg: TelegramBot.Message) => {
    const handler = botHandlers.find((handler) => {
      if (!msg.text) {
        return false;
      }
      return handler[0].test(msg.text);
    });
    if (!handler) {
      return;
    }
    const match = msg.text?.split(' ') ?? null;
    return await Promise.resolve(handler[1](bot)(msg, match));
  };
  const createChat = () => {
    chatId += 1;
    return chatId;
  };

  beforeAll(async () => {
    bot = new TelegramBot('test_token', { polling: true });
    await initializeDb();
  });

  afterAll(async () => {
    fs.rmSync(DATABASE_FILENAME);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should send welcome message and create a user', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/start',
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      const user = await findUserById(1);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Привет!'),
      );
      expect(user?.group_id).toBe(msg.chat.id);
    });
  });

  describe('help', () => {
    it('should send help message', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/help',
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Список команд'),
      );
    });
  });

  describe('create_group', () => {
    it('should create a new group', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/create_group',
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      const group = await findGroupByCode(String(msg.chat.id));
      expect(group).not.toBeNull();
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining(
          `Группа создана! Код для присоединения: ${msg.chat.id}`,
        ),
      );
    });
  });

  describe('join_group', () => {
    it('should add user to group', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      await createGroup(String(chatId));
      const user = await createUser(chatId);
      const msg = {
        chat: { id: chatId },
        text: `/join_group ${chatId}`,
        from: { id: 1 },
      } as unknown as TelegramBot.Message;
      expect(user).not.toBeUndefined();
      await addUserToGroup(msg.chat.id, user?.id ?? 0);

      await emitMsg(msg);

      const group = await findGroupByCode(String(msg.chat.id));
      expect(group).not.toBeNull();
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы присоединились к группе!'),
      );
    });

    it('should error without group code', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/join_group ',
        from: { id: 1 },
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Код группы не указан'),
      );
    });

    it('should error without user code', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/join_group 1',
        from: {},
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Пользователь не найден'),
      );
    });

    it('should error with wrong group code', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/join_group 9999',
        from: { id: 1 },
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Группа с таким кодом не найдена'),
      );
    });
  });

  describe('suggest', () => {
    it('should suggest a movie', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/suggest Inception',
      } as unknown as TelegramBot.Message;
      await createGroup(String(msg.chat.id));
      const user = await createUser(msg.chat.id);
      expect(user).not.toBeUndefined();
      await addUserToGroup(msg.chat.id, user?.id ?? 0);

      await emitMsg(msg);

      const movie = await suggestMovie(
        'Inception',
        user?.id ?? 0,
        msg.chat.id,
        'https://www.kinopoisk.ru/index.php?kp_query=Inception',
        'https://www.imdb.com/find/?q=Inception',
      );
      expect(movie).not.toBeNull();
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм предложен'),
        expect.objectContaining({}),
      );
    });
  });

  describe('vote', () => {
    it('should vote for a movie', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/vote 1',
      } as unknown as TelegramBot.Message;
      await createGroup(String(msg.chat.id));
      const user = await createUser(msg.chat.id);
      expect(user).not.toBeUndefined();
      await addUserToGroup(msg.chat.id, user?.id ?? 0);
      const insertedMovie = await suggestMovie(
        'Inception',
        user?.id ?? 0,
        msg.chat.id,
        'https://www.kinopoisk.ru/index.php?kp_query=Inception',
        'https://www.imdb.com/find/?q=Inception',
      );
      expect(insertedMovie).not.toBeUndefined();

      await emitMsg({
        ...msg,
        text: `/vote ${insertedMovie?.id}`,
      });

      const movie = await findMovieById(insertedMovie?.id ?? 0, msg.chat.id);

      expect(movie?.votes).toBe(1);
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы проголосовали за фильм'),
      );
    });

    it('should error with wrong group code', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/vote',
        from: { id: 1 },
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм не найдена'),
      );
    });

    it('should error with wrong group code', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/vote qwe',
        from: { id: 1 },
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм не найдена'),
      );
    });
  });

  describe('list', () => {
    it('should print current list of movies', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/list',
      } as unknown as TelegramBot.Message;
      await createGroup(String(msg.chat.id));
      const user = await createUser(msg.chat.id);
      await addUserToGroup(msg.chat.id, user?.id ?? 0);
      const movie = await suggestMovie(
        'Inception',
        user?.id ?? 0,
        msg.chat.id,
        'https://www.kinopoisk.ru/index.php?kp_query=Inception',
        'https://www.imdb.com/find/?q=Inception',
      );
      expect(movie).not.toBeUndefined();

      await emitMsg(msg);
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining(movie?.name ?? 'Inception'),
        expect.objectContaining({}),
      );
    });

    it('should error if user not in group', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/list',
      } as unknown as TelegramBot.Message;
      await createUser(msg.chat.id);

      await emitMsg(msg);
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы не состоите'),
        expect.objectContaining({}),
      );
    });
  });

  describe('veto', () => {
    it('veto command should veto a movie', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      await createGroup(String(chatId));
      const user = await createUser(chatId);
      const msg = {
        chat: { id: chatId },
        text: '/veto 1',
        from: { id: user?.id ?? 0 },
      } as unknown as TelegramBot.Message;
      await addUserToGroup(msg.chat.id, user?.id ?? 0);
      const insertedMovie = await suggestMovie(
        'Inception',
        user?.id ?? 0,
        chatId,
        'https://www.kinopoisk.ru/index.php?kp_query=Inception',
        'https://www.imdb.com/find/?q=Inception',
      );

      await emitMsg({
        ...msg,
        text: `/veto ${insertedMovie?.id ?? 0}`,
      });

      const movie = await findMovieById(insertedMovie?.id ?? 0, chatId);

      expect(movie?.is_vetoed).toBe(1);
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм удален'),
      );
    });
  });

  describe('random', () => {
    it('should send a random movie', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      await createGroup(String(chatId));
      const user = await createUser(chatId);
      const msg = {
        chat: { id: chatId },
        text: '/random',
        from: { id: user?.id ?? 0 },
      } as unknown as TelegramBot.Message;
      await addUserToGroup(msg.chat.id, user?.id ?? 0);
      await suggestMovie(
        'Inception',
        user?.id ?? 0,
        chatId,
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

    it('should error is list is empty', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      await createGroup(String(chatId));
      const user = await createUser(chatId);
      const msg = {
        chat: { id: chatId },
        text: '/random',
        from: { id: user?.id ?? 0 },
      } as unknown as TelegramBot.Message;
      await addUserToGroup(msg.chat.id, user?.id ?? 0);

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Список фильмов пуст'),
        expect.objectContaining({}),
      );
    });
  });
});
