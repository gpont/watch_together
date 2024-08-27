import { TMiddleware } from '../controllers.types';
import mock from './mock.json';

export const mockData: TMiddleware =
  (handler) => (bot) => async (msg, match) => {
    let newMsg = msg;
    if (process.env.DEBUG_OUTPUT === '1') {
      newMsg = {
        ...msg,
        from: {
          ...msg.from,
          ...mock.from,
        },
      };
    }

    await handler(bot)(newMsg, match);
  };
