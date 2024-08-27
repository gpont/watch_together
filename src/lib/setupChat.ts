// Fix for error: node-telegram-bot-api
// deprecated Automatic enabling of cancellation
// of promises is deprecated In the future
process.env.NTBA_FIX_319 = '1';
import TelegramBot from 'node-telegram-bot-api';
import {
  addUserToGroup,
  createGroup,
  createUser,
  IGroup,
  IUser,
} from '../models';

interface IChatData {
  sendMessage: jest.SpyInstance;
  chatId: number;
  user: IUser;
  group: IGroup;
  msg: TelegramBot.Message;
}

interface IAvailableActions {
  createGroup?: boolean;
  createUser?: boolean;
  addUserToGroup?: boolean;
}

export type TSetupChat = {
  (command: string): Promise<IChatData>;
  (
    command: string,
    actions: IAvailableActions & {
      createGroup: false;
    },
  ): Promise<Omit<IChatData, 'group'>>;
  (
    command: string,
    actions: IAvailableActions & {
      createUser: false;
    },
  ): Promise<Omit<IChatData, 'user'>>;
  (
    command: string,
    actions: IAvailableActions & {
      createUser: false;
      createGroup: false;
    },
  ): Promise<Omit<IChatData, 'user' | 'group'>>;
  (
    command: string,
    actions: IAvailableActions & {
      addUserToGroup: false;
    },
  ): Promise<IChatData>;
};

export const createSetupChat =
  (bot: TelegramBot, createChat: () => number): TSetupChat =>
  async (
    command: string,
    actions: IAvailableActions = {},
  ): Promise<IChatData> => {
    const sendMessage = jest.spyOn(bot, 'sendMessage');
    const chatId = createChat();
    const user =
      actions?.createUser !== false
        ? await createUser(String(chatId), chatId)
        : undefined;
    const group =
      actions?.createGroup !== false ? await createGroup() : undefined;
    if (actions?.addUserToGroup !== false && user && group) {
      await addUserToGroup(group.id, user.id);
    }
    const msg = {
      chat: { id: chatId },
      text: command,
      from: user ? { username: user?.username, id: chatId } : undefined,
    } as TelegramBot.Message;

    return {
      sendMessage,
      chatId,
      user,
      group,
      msg,
    } as IChatData;
  };
