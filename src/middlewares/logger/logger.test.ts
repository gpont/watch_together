// Fix for error: node-telegram-bot-api
// deprecated Automatic enabling of cancellation
// of promises is deprecated In the future
process.env.NTBA_FIX_319 = '1';
import TelegramBot from 'node-telegram-bot-api';
import { logger } from './logger';

describe('logger middleware', () => {
  it('should log user message', async () => {
    const loggerMock = jest.spyOn(console, 'log');
    const bot = {} as TelegramBot;
    const handler = () => () => Promise.resolve(undefined);
    const msg = {
      from: { username: 'test_user' },
      text: 'Hello, bot!',
    } as unknown as TelegramBot.Message;

    process.env.DEBUG_OUTPUT = '1';
    logger(handler)(bot)(msg, ['']);

    expect(loggerMock).toHaveBeenCalledWith(
      expect.stringContaining('User: test_user, Message: Hello, bot!'),
    );
    expect(loggerMock).toHaveBeenCalledWith(expect.stringContaining('DB'));
  });

  it('should log message from unknown user', async () => {
    const loggerMock = jest.spyOn(console, 'log');
    const bot = {} as TelegramBot;
    const handler = () => () => Promise.resolve(undefined);
    const msg = {
      text: 'Hello, bot!',
    } as unknown as TelegramBot.Message;

    process.env.DEBUG_OUTPUT = '1';
    logger(handler)(bot)(msg, ['']);

    expect(loggerMock).toHaveBeenCalledWith(
      expect.stringContaining('User: undefined, Message: Hello, bot!'),
    );
    expect(loggerMock).toHaveBeenCalledWith(expect.stringContaining('DB'));
  });
});
