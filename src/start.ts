// Fix for error: node-telegram-bot-api
// deprecated Automatic enabling of cancellation
// of promises is deprecated In the future
process.env.NTBA_FIX_319 = '1';
import TelegramBot from 'node-telegram-bot-api';
import { botHandlers } from './controllers';
import { green } from './helpers';

const token = process.env.BOT_TOKEN as string;
const bot = new TelegramBot(token, { polling: true });

botHandlers.forEach(([regexp, handler]) => {
  bot.onText(regexp, handler(bot));
});

console.log(
  `${green('Bot is running...')} DEBUG_OUTPUT=${process.env.DEBUG_OUTPUT}`,
);
