import { THandler } from '../controllersTypes';
import { CheckError } from './CheckError';

export const handleCheckErrors =
  (handler: THandler): THandler =>
  (bot) =>
  async (msg, match) => {
    try {
      await handler(bot)(msg, match);
    } catch (error) {
      if (error instanceof CheckError) {
        bot.sendMessage(msg.chat.id, error.message);
      } else {
        throw error;
      }
    }
  };
