import TelegramBot from 'node-telegram-bot-api';
import { botHandlers } from './controllers/bot';

const token = 'YOUR_BOT_TOKEN';
const bot = new TelegramBot(token, { polling: true });

botHandlers.forEach(([regexp, handler]) => {
  bot.onText(regexp, handler(bot));
});
