import { listAllTablesData } from '../../dbController';
import { log } from '../../helpers';
import { TMiddleware } from '../controllers.types';

export const logger: TMiddleware = (handler) => (bot) => async (msg, match) => {
  if (process.env.DEBUG_OUTPUT === '1') {
    log(`User: ${msg.from?.username}, Command: ${msg.text}`);
    log('DB:');
    await listAllTablesData();
  }

  await handler(bot)(msg, match);
};
