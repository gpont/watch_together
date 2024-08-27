// Fix for error: node-telegram-bot-api
// deprecated Automatic enabling of cancellation
// of promises is deprecated In the future
process.env.NTBA_FIX_319 = '1';
import TelegramBot from 'node-telegram-bot-api';
import { TRule } from '../middlewares';

export const createEmit =
  (botHandlers: TRule[], bot: TelegramBot) =>
  async (msg: TelegramBot.Message) => {
    const handler = botHandlers.find((handler) =>
      msg.text ? handler[0].test(msg.text) : false,
    );
    if (!handler) {
      return;
    }
    const match = msg.text?.split(' ') ?? null;
    const msgHandler = handler[1](bot);
    return await msgHandler(msg, match);
  };
export const createCreateChat = () => {
  let chatId = 0;
  return () => {
    chatId += 1;
    return chatId;
  };
};
