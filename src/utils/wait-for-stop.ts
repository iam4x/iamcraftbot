import signale from 'signale';
import { Receiver, Sender } from 'xstate';

import { BotMachineContext, BotMachineEvent } from '../types';

export function waitForStop(context: BotMachineContext) {
  return (callback: Sender<BotMachineEvent>, onReceive: Receiver<any>) => {
    const onWhisper = (username: string, message: string) => {
      // dont listen to own bot messages
      if (context?.bot?.username === username) {
        return undefined;
      }

      // dont listen to non-operators
      if (!context.operators.includes(username)) {
        return undefined;
      }

      if (message.toLowerCase() === 'stop') {
        context.bot?.off('whisper', onWhisper);
        context.bot!.unequip('hand');
        context.bot?.whisper(username, 'Ok, I stop');
        signale.info('received stop command');
        return callback({ type: 'STOP' });
      } else {
        context.bot?.whisper(username, "I'm working! Ask me to stop before");
        signale.warn(`received "${message}" while working`);
      }

      return undefined;
    };

    onReceive((e: BotMachineEvent) => {
      if (e.type === 'ERROR') {
        signale.warn('received error event, will stop action');
        context.bot?.off('whisper', onWhisper);
        callback({ type: 'STOP' });
      }
    });

    context.bot?.on('whisper', onWhisper);
  };
}
