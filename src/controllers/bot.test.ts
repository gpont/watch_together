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
} from '../models/moviesModel';
import { initializeDb } from '../models/database';
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

  it('start command should send welcome message and create a user', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 123 },
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

  it('help command should send help message', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 123 },
      text: '/help',
    } as unknown as TelegramBot.Message;

    await emitMsg(msg);

    expect(sendMessage).toHaveBeenCalledWith(
      msg.chat.id,
      expect.stringContaining('Список команд'),
    );
  });

  it('create_group command should create a new group', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 124 },
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

  it('join_group command should add user to group', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const chatId = 125;
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

  it('suggest_movie command should suggest a movie', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 126 },
      text: '/suggest_movie Inception',
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
      expect.stringContaining('Фильм предложен!'),
    );
  });

  it('vote command should vote for a movie', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 127 },
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
      expect.stringContaining('Вы проголосовали за фильм!'),
    );
  });

  it('list_movies command should list movies', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 128 },
      text: '/list_movies',
    } as unknown as TelegramBot.Message;
    await createGroup(String(msg.chat.id));
    const user = await createUser(msg.chat.id);
    expect(user).not.toBeUndefined();
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

  it('veto command should not veto on own movie', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const chatId = 129;
    await createGroup(String(chatId));
    const user = await createUser(chatId);
    expect(user).not.toBeUndefined();
    const msg = {
      chat: { id: chatId },
      text: '/veto 1',
      from: { id: user?.id },
    } as unknown as TelegramBot.Message;
    await addUserToGroup(msg.chat.id, user?.id ?? 0);
    const movie = await suggestMovie(
      'Inception',
      user?.id ?? 0,
      msg.chat.id,
      'https://www.kinopoisk.ru/index.php?kp_query=Inception',
      'https://www.imdb.com/find/?q=Inception',
    );

    await emitMsg({
      ...msg,
      text: `/veto ${movie?.id}`,
    });

    expect(movie).not.toBeUndefined();
    expect(sendMessage).toHaveBeenCalledWith(
      msg.chat.id,
      expect.stringContaining('Вы не можете наложить вето на свой же фильм.'),
    );
  });

  it('veto command should veto a movie', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const chatId = 130;
    await createGroup(String(chatId));
    const user1 = await createUser(chatId);
    const user2 = await createUser(chatId);
    expect(user1).not.toBeUndefined();
    expect(user2).not.toBeUndefined();
    const msg = {
      chat: { id: chatId },
      text: '/veto 1',
      from: { id: user2?.id ?? 0 },
    } as unknown as TelegramBot.Message;
    await addUserToGroup(msg.chat.id, user1?.id ?? 0);
    await addUserToGroup(msg.chat.id, user2?.id ?? 0);
    const movie = await suggestMovie(
      'Inception',
      user1?.id ?? 0,
      msg.chat.id,
      'https://www.kinopoisk.ru/index.php?kp_query=Inception',
      'https://www.imdb.com/find/?q=Inception',
    );

    await emitMsg({
      ...msg,
      text: `/veto ${movie?.id ?? 0}`,
    });

    expect(movie).not.toBeNull();
    expect(sendMessage).toHaveBeenCalledWith(
      msg.chat.id,
      expect.stringContaining('Фильм отклонен!'),
    );
  });
});
