import signale from 'signale';
import { goals } from 'mineflayer-pathfinder';

import { BotMachineContext } from '../types';

export function followPlayer({ bot, follow_username }: BotMachineContext) {
  return new Promise((resolve) => {
    const target = bot?.players[follow_username!]?.entity;

    if (!target) {
      signale.error(`did not find player ${follow_username}" nearby`);
      return resolve(undefined);
    }

    // listen for "stop" command
    const onChat = (username: string, message: string) => {
      if (username === follow_username && message.toLowerCase() === 'stop') {
        bot?.pathfinder.setGoal(null as any);
        bot?.off('chat', onChat);
        return resolve(undefined);
      }
      return undefined;
    };

    bot?.on('chat', onChat);
    bot?.pathfinder?.setGoal(new goals.GoalFollow(target, 2), true);

    return undefined;
  });
}
