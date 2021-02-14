import signale from 'signale';
import { BotMachineContext } from '../types';

export function listenDisconnect({ bot }: BotMachineContext) {
  return new Promise((resolve) => {
    bot?.on('error', (err) => signale.error(err));
    bot?.on('end', () => {
      signale.error('bot disconnected, will reconnect in 10 seconds');
      resolve(undefined);
    });
  });
}
