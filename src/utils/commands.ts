import signale from 'signale';
import { Sender } from 'xstate';

import { BotMachineContext, BotMachineEvent } from '../types';

export function listenChatCommands(context: BotMachineContext) {
  return (callback: Sender<BotMachineEvent>) => {
    const handler = (username: string, message: string) => {
      // dont listen to own bot messages
      if (context?.bot?.username === username) {
        return undefined;
      }

      // dont listen to non-operators
      if (!context.operators.includes(username)) {
        return undefined;
      }

      switch (true) {
        case message === 'come': {
          signale.info(`received "come" command`);
          context.bot!.whisper(username, "Ok! I'm coming to you");
          context.move_to_username = username;
          return callback({ type: 'MOVE_TO_PLAYER' });
        }

        case message === 'follow': {
          signale.info(`received "follow" command`);
          context.bot!.whisper(username, "Ok! I'm following you");
          context.follow_username = username;
          return callback({ type: 'FOLLOW_PLAYER' });
        }

        case message === 'farm': {
          signale.info(`received "farm" command`);
          context.bot!.whisper(username, "Ok! I'm starting to farm");
          return callback({ type: 'FARM' });
        }

        case message === 'fish': {
          signale.info(`received "fish" command`);
          context.bot!.whisper(username, "Ok! I'm starting to fish");
          return callback({ type: 'FISH' });
        }

        case message.startsWith('enable'): {
          const [, option] = message.split(' ');
          if (option in context.options) {
            context.bot?.whisper(username, `enabled "${option}"`);
            context.options[option as keyof typeof context.options] = true;
          } else {
            context.bot?.whisper(username, `unknown "${option}"`);
          }
          return undefined;
        }

        case message.startsWith('disable'): {
          const [, option] = message.split(' ');
          if (option in context.options) {
            context.bot?.whisper(username, `disabled "${option}"`);
            context.options[option as keyof typeof context.options] = false;
          } else {
            context.bot?.whisper(username, `unknown "${option}"`);
          }
          return undefined;
        }

        default:
          return undefined;
      }
    };

    context.bot?.on('whisper', handler);
    signale.info('bot listening for command');

    return () => context.bot?.off('whisper', handler);
  };
}
