import signale from 'signale';
import { BotMachineContext } from '../types';

export function waitForStop(context: BotMachineContext) {
  return new Promise((resolve) => {
    function handler(username: string, message: string) {
      // dont listen to own bot messages
      if (context?.bot?.username === username) {
        return undefined;
      }

      // dont listen to non-operators
      if (!context.operators.includes(username)) {
        return undefined;
      }

      if (message.toLowerCase() === 'stop') {
        context.bot?.off('whisper', handler);
        context.bot?.whisper(username, 'Ok, I stop');
        signale.info('received stop command');
        return resolve(undefined);
      } else {
        context.bot?.whisper(username, "I'm working! Ask me to stop before");
        signale.warn(`received "${message}" while working`);
      }

      return undefined;
    }

    context.bot?.on('whisper', handler);
  });
}
