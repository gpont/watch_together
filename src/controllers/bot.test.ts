import fs from 'fs';
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
import { initializeDb } from '../models/database';

// jest.mock('node-telegram-bot-api');

describe('Bot Commands', () => {
  const DATABASE_FILENAME = './test_database.db';
  let bot: TelegramBot;

  beforeAll(async () => {
    await initializeDb(DATABASE_FILENAME);
    bot = new TelegramBot('YOUR_BOT_TOKEN', { polling: false });
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
    // @ts-ignore
    bot.emit('message', msg);

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
    // @ts-ignore
    bot.emit('message', msg);

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
    await createGroup(String(msg.chat.id));
    // @ts-ignore
    bot.emit('message', msg);

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
    await createGroup('123');
    await createUser(msg.chat.id);
    const user = await findUserByTelegramId(msg.chat.id);
    await addUserToGroup(123, user.id);
    // @ts-ignore
    bot.emit('message', msg);

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
    await createGroup('123');
    await createUser(msg.chat.id);
    const user = await findUserByTelegramId(msg.chat.id);
    await addUserToGroup(123, user.id);
    // @ts-ignore
    bot.emit('message', msg);

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

  // Добавьте другие тесты для команд, как в примере выше
});
