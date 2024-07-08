import TelegramBot from 'node-telegram-bot-api';
import { openDb, initializeDb } from '../models/database';

const token = 'YOUR_BOT_TOKEN';
const bot = new TelegramBot(token, { polling: true });

initializeDb();

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Привет! Я бот для выбора фильма. Используйте /help для получения списка команд.');
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Список команд:\n'
    + '/create_group - создать группу\n'
    + '/join_group <код> - присоединиться к группе\n'
    + '/suggest_movie <название фильма> - предложить фильм\n'
    + '/vote <номер фильма> - проголосовать за фильм\n'
    + '/list_movies - показать список фильмов\n'
    + '/watched <номер фильма> - отметить фильм как просмотренный\n'
    + '/veto <номер фильма> - наложить вето на фильм');
});

bot.onText(/\/create_group/, async (msg) => {
  const chatId = msg.chat.id;
  const db = await openDb();
  const result = await db.run(`INSERT INTO groups (code) VALUES (?)`, [String(chatId)]);
  bot.sendMessage(chatId, `Группа создана! Код для присоединения: ${chatId}`);
});

bot.onText(/\/join_group (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const groupCode = match[1];

  const db = await openDb();
  const group = await db.get(`SELECT id FROM groups WHERE code = ?`, [groupCode]);
  if (group) {
    await db.run(`INSERT OR IGNORE INTO users (telegram_id) VALUES (?)`, [chatId]);
    const user = await db.get(`SELECT id FROM users WHERE telegram_id = ?`, [chatId]);
    await db.run(`INSERT INTO group_users (group_id, user_id) VALUES (?, ?)`, [group.id, user.id]);
    bot.sendMessage(chatId, 'Вы присоединились к группе!');
  } else {
    bot.sendMessage(chatId, 'Группа с таким кодом не найдена.');
  }
});

bot.onText(/\/suggest_movie (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const movieName = match[1];

  const db = await openDb();
  await db.run(`INSERT OR IGNORE INTO users (telegram_id) VALUES (?)`, [chatId]);
  const user = await db.get(`SELECT id FROM users WHERE telegram_id = ?`, [chatId]);
  const groupUser = await db.get(`SELECT group_id FROM group_users WHERE user_id = ?`, [user.id]);
  
  if (groupUser) {
    const link = `https://www.kinopoisk.ru/index.php?kp_query=${encodeURIComponent(movieName)}`;
    await db.run(`INSERT INTO movies (name, suggested_by, group_id, link) VALUES (?, ?, ?, ?)`, [movieName, user.id, groupUser.group_id, link]);
    bot.sendMessage(chatId, `Фильм "${movieName}" предложен!`);
  } else {
    bot.sendMessage(chatId, 'Вы не состоите ни в одной группе.');
  }
});

bot.onText(/\/vote (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const movieId = match[1];

  const db = await openDb();
  const movie = await db.get(`SELECT name FROM movies WHERE id = ?`, [movieId]);

  if (movie) {
    await db.run(`UPDATE movies SET votes = votes + 1 WHERE id = ?`, [movieId]);
    bot.sendMessage(chatId, `Вы проголосовали за фильм "${movie.name}"!`);
  } else {
    bot.sendMessage(chatId, 'Фильм с таким номером не найден.');
  }
});

bot.onText(/\/list_movies/, async (msg) => {
  const chatId = msg.chat.id;
  const db = await openDb();
  const movies = await db.all(`SELECT id, name, suggested_by, votes, link FROM movies`);

  if (movies.length > 0) {
    let movieList = 'Список фильмов:\n';
    for (const movie of movies) {
      movieList += `${movie.id}. ${movie.name} (голоса: ${movie.votes}) - ${movie.link}\n`;
    }
    bot.sendMessage(chatId, movieList);
  } else {
    bot.sendMessage(chatId, 'Список фильмов пуст.');
  }
});

bot.onText(/\/watched (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const movieId = match[1];

  const db = await openDb();
  const movie = await db.get(`SELECT name FROM movies WHERE id = ?`, [movieId]);

  if (movie) {
    await db.run(`DELETE FROM movies WHERE id = ?`, [movieId]);
    bot.sendMessage(chatId, `Фильм "${movie.name}" отмечен как просмотренный и удален из списка.`);
  } else {
    bot.sendMessage(chatId, 'Фильм с таким номером не найден.');
  }
});

bot.onText(/\/veto (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const movieId = match[1];

  const db = await openDb();
  const movie = await db.get(`SELECT name, suggested_by FROM movies WHERE id = ?`, [movieId]);

  if (movie) {
    const user = await db.get(`SELECT id FROM users WHERE telegram_id = ?`, [chatId]);
    if (movie.suggested_by !== user.id) {
      await db.run(`DELETE FROM movies WHERE id = ?`, [movieId]);
      bot.sendMessage(chatId, `Фильм "${movie.name}" удален с вето.`);
    } else {
      bot.sendMessage(chatId, 'Вы не можете наложить вето на свой же фильм.');
    }
  } else {
    bot.sendMessage(chatId, 'Фильм с таким номером не найден.');
  }
});
