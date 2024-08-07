// Fix for error: node-telegram-bot-api
// deprecated Automatic enabling of cancellation
// of promises is deprecated In the future
process.env.NTBA_FIX_319 = '1';
import TelegramBot from 'node-telegram-bot-api';
import { handleCheckErrors } from './handleCheckErrors';

describe('handleCheckErrors', () => {
  it('should handle CheckError', async () => {
    const bot = { sendMessage: jest.fn() } as unknown as TelegramBot;
    const handler = jest.fn(() => () => undefined);
    const msg = { chat: { id: 1 } } as unknown as TelegramBot.Message;

    const checkErrorsHandler = handleCheckErrors(handler);

    await expect(
      checkErrorsHandler(bot)(msg, ['', 'arg']),
    ).resolves.toBeUndefined();
  });

  it('should throw error if not CheckError', async () => {
    const bot = { sendMessage: jest.fn() } as unknown as TelegramBot;
    const handler = jest.fn(() => () => {
      throw new Error('Not a CheckError');
    });
    const msg = { chat: { id: 1 } } as unknown as TelegramBot.Message;

    const checkErrorsHandler = handleCheckErrors(handler);

    await expect(checkErrorsHandler(bot)(msg, ['', 'arg'])).rejects.toThrow(
      'Not a CheckError',
    );
  });
});
