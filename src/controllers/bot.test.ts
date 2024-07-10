import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import {
  createGroup,
  findGroupByCode,
  createUser,
  findUserByTelegramId,
  addUserToGroup,
  suggestMovie,
} from '../models/moviesModel';
import { initializeDb } from '../models/database';
import { botHandlers } from './bot';

jest.mock('node-telegram-bot-api');

describe('Bot Commands', () => {
  const DATABASE_FILENAME = './test_database.db';
  let bot: TelegramBot;
  const emitMsg = (msg: TelegramBot.Message) => {
    const handler = botHandlers.find((handler) => {
      if (!msg.text) {
        return false;
      }
      return handler[0].test(msg.text);
    });
    if (!handler) {
      return;
    }
    handler[1](bot)(msg, null);
  };

  beforeAll(async () => {
    bot = new TelegramBot('test_token', { polling: true });
    await initializeDb(DATABASE_FILENAME);
  });

  afterAll(async () => {
    fs.rmSync(DATABASE_FILENAME);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('start command should send welcome message', () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 123 },
      text: '/start',
    } as unknown as TelegramBot.Message;

    emitMsg(msg);

    expect(sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Привет!'),
    );
  });

  test('help command should send help message', () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 123 },
      text: '/help',
    } as unknown as TelegramBot.Message;

    emitMsg(msg);

    expect(sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Список команд'),
    );
  });

  test('create_group command should create a new group', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 123 },
      text: '/create_group',
    } as unknown as TelegramBot.Message;
    await createGroup(String(msg.chat.id), DATABASE_FILENAME);

    emitMsg(msg);

    const group = await findGroupByCode(String(msg.chat.id));
    expect(group).not.toBeNull();
    expect(sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Группа создана! Код для присоединения: 123'),
    );
  });

  test('join_group command should add user to group', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 123 },
      text: '/join_group 123',
    } as unknown as TelegramBot.Message;
    await createGroup('123', DATABASE_FILENAME);
    await createUser(msg.chat.id, DATABASE_FILENAME);
    const user = await findUserByTelegramId(msg.chat.id, DATABASE_FILENAME);
    await addUserToGroup(123, user.id, DATABASE_FILENAME);

    emitMsg(msg);

    const group = await findGroupByCode('123');
    expect(group).not.toBeNull();
    expect(sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Вы присоединились к группе!'),
    );
  });

  test('suggest_movie command should suggest a movie', async () => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const msg = {
      chat: { id: 123 },
      text: '/suggest_movie Inception',
    } as unknown as TelegramBot.Message;
    await createGroup('123', DATABASE_FILENAME);
    await createUser(msg.chat.id, DATABASE_FILENAME);
    const user = await findUserByTelegramId(msg.chat.id, DATABASE_FILENAME);
    await addUserToGroup(123, user.id, DATABASE_FILENAME);

    emitMsg(msg);

    const movie = await suggestMovie(
      'Inception',
      user.id,
      123,
      'https://www.kinopoisk.ru/index.php?kp_query=Inception',
    );
    expect(movie).not.toBeNull();
    expect(sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Фильм предложен!'),
    );
  });

  // TODO add more tests for other bot commands
});
