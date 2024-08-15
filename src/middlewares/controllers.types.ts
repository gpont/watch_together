// Fix for error: node-telegram-bot-api
// deprecated Automatic enabling of cancellation
// of promises is deprecated In the future
process.env.NTBA_FIX_319 = '1';
import TelegramBot from 'node-telegram-bot-api';

export type THandler = (
  bot: TelegramBot,
) => (msg: TelegramBot.Message, match: string[] | null) => Promise<void>;

export type TRule = [RegExp, THandler];

export type TMiddleware = (handler: THandler) => THandler;
