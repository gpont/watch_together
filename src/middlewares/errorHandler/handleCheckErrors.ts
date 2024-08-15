import { TMiddleware } from '../controllers.types';
import { CheckError } from './CheckError';

export const handleCheckErrors: TMiddleware =
  (handler) => (bot) => async (msg, match) => {
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
