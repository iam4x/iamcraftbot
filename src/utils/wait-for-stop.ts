import { BotMachineContext } from '../types';

export function waitForStop(context: BotMachineContext) {
  return new Promise((resolve) => {
    function handler(username: string, message: string) {
      if (username !== context.bot?.username && message === 'stop') {
        context.bot?.off('chat', handler);
        return resolve(undefined);
      }
      return undefined;
    }
    context.bot?.on('chat', handler);
  });
}
