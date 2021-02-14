import signale from 'signale';
import { Sender } from 'xstate';

import { BotMachineContext, BotMachineEvent } from '../types';

export function listenChatCommands(context: BotMachineContext) {
  return (callback: Sender<BotMachineEvent>) => {
    const handler = (username: string, message: string) => {
      // dont listen to own bot messages
      console.log(context.bot?.player.username);
      console.log(context.bot?.username);
      if (context?.bot?.username === username) {
        return undefined;
      }

      console.log({ username, message });

      switch (true) {
        case message === 'come': {
          signale.info(`received "come" command`);
          return callback({
            type: 'MOVE_TO_PLAYER',
            data: { username },
          });
        }

        case message === 'follow': {
          signale.info(`received "follow" command`);
          return callback({
            type: 'FOLLOW_PLAYER',
            data: { username },
          });
        }

        case message === 'farm': {
          signale.info(`received "farm" command`);
          return callback({ type: 'FARM' });
        }

        case message.startsWith('enable'): {
          const [, option] = message.split(' ');
          if (option in context.options) {
            context.bot?.chat(`enabled "${option}"`);
            context.options[option as keyof typeof context.options] = true;
          } else {
            context.bot?.chat(`unknown "${option}"`);
          }
          return undefined;
        }

        case message.startsWith('disable'): {
          const [, option] = message.split(' ');
          if (option in context.options) {
            context.bot?.chat(`disabled "${option}"`);
            context.options[option as keyof typeof context.options] = false;
          } else {
            context.bot?.chat(`unknown "${option}"`);
          }
          return undefined;
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
