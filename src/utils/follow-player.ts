import signale from 'signale';
import { goals } from 'mineflayer-pathfinder';

import { BotMachineContext } from '../types';

export function followPlayer({
  bot,
  operators,
  follow_username,
}: BotMachineContext) {
  return new Promise((resolve) => {
    const target = bot?.players[follow_username!]?.entity;

    if (!target) {
      signale.error(`did not find player ${follow_username}" nearby`);
      return resolve(undefined);
    }

    // listen for "stop" command
    const onWhisper = (username: string, message: string) => {
      if (operators.includes(username) && message.toLowerCase() === 'stop') {
        bot?.pathfinder.setGoal(null as any);
        bot?.off('whisper', onWhisper);
        bot?.whisper(username, "I'm not following you anymore");
        return resolve(undefined);
      }
      return undefined;
    };

    bot?.on('whisper', onWhisper);
    bot?.pathfinder?.setGoal(new goals.GoalFollow(target, 1), true);

    return undefined;
  });
}
