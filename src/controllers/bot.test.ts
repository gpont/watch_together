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
  findUserByTelegramId,
  addUserToGroup,
  suggestMovie,
  findMovieById,
} from '../models/moviesModel';
import { initializeDb } from '../models/database';
import { botHandlers } from './bot';

const DATABASE_FILENAME = './test_database.db';

jest.mock('node-telegram-bot-api');
jest.mock('../models/consts.ts', () => ({
  DATABASE_FILENAME: './test_database.db',
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

    const user = await findUserByTelegramId(msg.chat.id);

    expect(sendMessage).toHaveBeenCalledWith(
      msg.chat.id,
      expect.stringContaining('Привет!'),
    );
    expect(user.telegram_id).toBe(msg.chat.id);
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
    const msg = {
      chat: { id: 125 },
      text: '/join_group 125',
    } as unknown as TelegramBot.Message;
    await createGroup(String(msg.chat.id));
    const user = await createUser(msg.chat.id);
    await addUserToGroup(msg.chat.id, user.id);

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
    await addUserToGroup(msg.chat.id, user.id);

    await emitMsg(msg);

    const movie = await suggestMovie(
      'Inception',
      user.id,
      msg.chat.id,
      'https://www.kinopoisk.ru/index.php?kp_query=Inception',
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
      chat: { id: 128 },
      text: '/vote 1',
    } as unknown as TelegramBot.Message;
    await createGroup(String(msg.chat.id));
    const user = await createUser(msg.chat.id);
    await addUserToGroup(msg.chat.id, user.id);
    const insertedMovie = await suggestMovie(
      'Inception',
      user.id,
      msg.chat.id,
      'https://www.kinopoisk.ru/index.php?kp_query=Inception',
    );

    await emitMsg(msg);

    const movie = await findMovieById(insertedMovie.id);

    expect(movie.votes).toBe(1);
    expect(sendMessage).toHaveBeenCalledWith(
      msg.chat.id,
      expect.stringContaining('Ваш голос учтен!'),
    );
  });

  it('list_movies command should list movies', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 129 },
      text: '/list_movies',
    } as unknown as TelegramBot.Message;
    await createGroup(String(msg.chat.id));
    const user = await createUser(msg.chat.id);
    await addUserToGroup(msg.chat.id, user.id);
    const movie = await suggestMovie(
      'Inception',
      user.id,
      msg.chat.id,
      'https://www.kinopoisk.ru/index.php?kp_query=Inception',
    );

    await emitMsg(msg);
    expect(sendMessage).toHaveBeenCalledWith(
      msg.chat.id,
      expect.stringContaining('Inception'),
    );
  });

  it('veto command should veto a movie', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 127 },
      text: '/veto 1',
    } as unknown as TelegramBot.Message;
    await createGroup(String(msg.chat.id));
    const user = await createUser(msg.chat.id);
    await addUserToGroup(msg.chat.id, user.id);

    await emitMsg(msg);

    const movie = await suggestMovie(
      'Inception',
      user.id,
      msg.chat.id,
      'https://www.kinopoisk.ru/index.php?kp_query=Inception',
    );
    expect(movie).not.toBeNull();
    expect(sendMessage).toHaveBeenCalledWith(
      msg.chat.id,
      expect.stringContaining('Фильм отклонен!'),
    );
  });
});
