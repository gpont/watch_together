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
  findUserByUsername,
  listMovies,
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
        from: { username: 'test' },
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      const user = await findUserByUsername('test');

      expect(user).not.toBeUndefined();
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Привет!'),
      );
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

    it('should error with duplicate group code', async () => {
      const chatId = createChat();
      await createGroup(String(chatId));
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: chatId },
        text: '/create_group',
        from: { username: 'test' },
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Группа уже создана'),
      );
    });
  });

  describe('join_group', () => {
    it('should add user to group', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const group = await createGroup(String(chatId));
      const user = await createUser(String(chatId));
      const msg = {
        chat: { id: chatId },
        text: `/join_group ${chatId}`,
        from: { username: user?.username },
      } as unknown as TelegramBot.Message;
      await addUserToGroup(group.id, user?.id ?? 0);

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы присоединились к группе!'),
      );
    });

    it('should error without group code', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const user = await createUser(String(chatId));
      const msg = {
        chat: { id: createChat() },
        text: '/join_group ',
        from: { username: user?.username },
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
      const chatId = createChat();
      const user = await createUser(String(chatId));
      const msg = {
        chat: { id: chatId },
        text: '/join_group 9999',
        from: { username: user?.username },
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
      const user = await createUser(String(chatId));
      const msg = {
        chat: { id: createChat() },
        text: '/suggest Inception',
        from: { username: user?.username ?? 0 },
      } as unknown as TelegramBot.Message;
      const group = await createGroup(String(msg.chat.id));
      await addUserToGroup(group.id, user?.id ?? 0);

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
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/suggest Inception',
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Пользователь не найден'),
      );
    });

    it('should error if no movie name', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const user = await createUser(String(chatId));
      const msg = {
        chat: { id: createChat() },
        text: '/suggest ',
        from: { username: user?.username ?? 0 },
      } as unknown as TelegramBot.Message;
      const group = await createGroup(String(msg.chat.id));
      await addUserToGroup(group.id, user?.id ?? 0);

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
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const user = await createUser(String(chatId));
      const msg = {
        chat: { id: createChat() },
        text: '/vote 1',
        from: { username: user?.username ?? '' },
      } as unknown as TelegramBot.Message;
      const group = await createGroup(String(msg.chat.id));
      await addUserToGroup(group.id, user?.id ?? 0);
      const insertedMovie = await suggestMovie(
        'Inception',
        user?.id ?? 0,
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
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const group = await createGroup(String(chatId));
      const user = await createUser(String(chatId));
      await addUserToGroup(group.id, user?.id ?? 0);
      const msg = {
        chat: { id: chatId },
        text: '/vote 1',
        from: { username: user?.username ?? '' },
      } as unknown as TelegramBot.Message;
      const insertedMovie = await suggestMovie(
        'Inception',
        user?.id ?? 0,
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
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const user = await createUser(String(chatId));
      const group = await createGroup(String(chatId));
      await addUserToGroup(group.id, user?.id ?? 0);
      const msg = {
        chat: { id: chatId },
        text: '/vote',
        from: { username: user?.username ?? '' },
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм с таким номером не найден'),
      );
    });

    it('should error with wrong movie code', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const user = await createUser(String(chatId));
      const group = await createGroup(String(chatId));
      await addUserToGroup(group.id, user?.id ?? 0);
      const msg = {
        chat: { id: chatId },
        text: '/vote qwe',
        from: { username: user?.username ?? '' },
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм с таким номером не найден'),
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
      const group = await createGroup(String(msg.chat.id));
      const user = await createUser(String(chatId));
      await addUserToGroup(group.id, user?.id ?? 0);
      const movie = await suggestMovie(
        'Inception',
        user?.id ?? 0,
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
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/list',
      } as unknown as TelegramBot.Message;
      await createUser(String(msg.chat.id));

      await emitMsg(msg);
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы не состоите ни в одной группе'),
      );
    });
  });

  describe('watched', () => {
    it('should delete a movie from the list', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const group = await createGroup(String(chatId));
      const user = await createUser(String(chatId));
      const msg = {
        chat: { id: chatId },
        text: '/watched 1',
        from: { id: user?.id ?? 0 },
      } as unknown as TelegramBot.Message;
      await addUserToGroup(group.id, user?.id ?? 0);
      const insertedMovie = await suggestMovie(
        'Inception',
        user?.id ?? 0,
        group.id,
        'https://www.kinopoisk.ru/index.php?kp_query=Inception',
        'https://www.imdb.com/find/?q=Inception',
      );

      await emitMsg({
        ...msg,
        text: `/watched ${insertedMovie?.id ?? 0}`,
      });

      const movie = await findMovieById(insertedMovie?.id ?? 0, group.id);
      expect(movie).toBeUndefined();
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining(
          'Фильм отмечен как просмотренный и удален из списка',
        ),
      );
    });

    it('should error if no movie id', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/watched ',
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм с таким номером не найден'),
      );
    });

    it('should error if user not in group', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const msg = {
        chat: { id: createChat() },
        text: '/watched 9998',
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы не состоите ни в одной группе'),
      );
    });

    it('should error if wrong movie code', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const msg = {
        chat: { id: chatId },
        text: '/watched 9999',
      } as unknown as TelegramBot.Message;
      const group = await createGroup(String(chatId));
      const user = await createUser(String(chatId));
      await addUserToGroup(group.id, user?.id ?? 0);

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм с таким номером не найден'),
      );
    });
  });

  describe('veto', () => {
    it('veto command should veto a movie', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const group = await createGroup(String(chatId));
      const user = await createUser(String(chatId));
      const msg = {
        chat: { id: chatId },
        text: '/veto 1',
        from: { id: user?.id ?? 0 },
      } as unknown as TelegramBot.Message;
      await addUserToGroup(group.id, user?.id ?? 0);
      const insertedMovie = await suggestMovie(
        'Inception',
        user?.id ?? 0,
        group.id,
        'https://www.kinopoisk.ru/index.php?kp_query=Inception',
        'https://www.imdb.com/find/?q=Inception',
      );

      await emitMsg({
        ...msg,
        text: `/veto ${insertedMovie?.id ?? 0}`,
      });

      const movie = await findMovieById(insertedMovie?.id ?? 0, group.id);

      expect(movie?.is_vetoed).toBe(1);
      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм удален'),
      );
    });

    it('should error if no movie id', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const msg = {
        chat: { id: chatId },
        text: '/veto ',
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм с таким номером не найден'),
      );
    });

    it('should error if wrong movie code', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const user = await createUser(String(chatId));
      const group = await createGroup(String(chatId));
      const msg = {
        chat: { id: chatId },
        text: '/veto 9999',
        from: { id: user?.id ?? 0 },
      } as unknown as TelegramBot.Message;
      await addUserToGroup(group.id, user?.id ?? 0);

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Фильм с таким номером не найден'),
      );
    });
  });

  describe('random', () => {
    it('should send a random movie', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const group = await createGroup(String(chatId));
      const user = await createUser(String(chatId));
      const msg = {
        chat: { id: chatId },
        text: '/random',
        from: { id: user?.id ?? 0 },
      } as unknown as TelegramBot.Message;
      await addUserToGroup(group.id, user?.id ?? 0);
      await suggestMovie(
        'Inception',
        user?.id ?? 0,
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
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const user = await createUser(String(chatId));
      const msg = {
        chat: { id: chatId },
        text: '/random',
        from: { id: user?.id ?? 0 },
      } as unknown as TelegramBot.Message;

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Вы не состоите ни в одной группе'),
      );
    });

    it('should error if list is empty', async () => {
      const sendMessage = jest.spyOn(bot, 'sendMessage');
      const chatId = createChat();
      const group = await createGroup(String(chatId));
      const user = await createUser(String(chatId));
      const msg = {
        chat: { id: chatId },
        text: '/random',
        from: { id: user?.id ?? 0 },
      } as unknown as TelegramBot.Message;
      await addUserToGroup(group.id, user?.id ?? 0);

      await emitMsg(msg);

      expect(sendMessage).toHaveBeenCalledWith(
        msg.chat.id,
        expect.stringContaining('Список фильмов пуст'),
      );
    });
  });
});
