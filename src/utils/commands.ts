import signale from 'signale';
import { Sender } from 'xstate';

import { BotMachineContext, BotMachineEvent } from '../types';

export function listenChatCommands(context: BotMachineContext) {
  return (callback: Sender<BotMachineEvent>) => {
    const handler = (username: string, message: string) => {
      switch (message.toLowerCase()) {
        case 'come': {
          signale.info(`received "come" command`);
          return callback({
            type: 'MOVE_TO_PLAYER',
            data: { username },
          });
        }
        case 'follow': {
          signale.info(`received "follow" command`);
          return callback({
            type: 'FOLLOW_PLAYER',
            data: { username },
          });
        }
        case 'farm': {
          signale.info(`received "farm" command`);
          return callback({ type: 'FARM' });
        }
        default:
          return undefined;
      }
    };

    context.bot?.on('chat', handler);
    signale.info('bot listening for command');

    return () => context.bot?.off('chat', handler);
  };
}
