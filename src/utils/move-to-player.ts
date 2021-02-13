import { goals } from 'mineflayer-pathfinder';

import { BotMachineContext } from '../types';
import { moveTo } from './move-to';

const signale = require('signale').scope('moveToPlayer');

export function moveToPlayer({ bot, move_to_username }: BotMachineContext) {
  return new Promise((resolve) => {
    const playerPos = bot?.players[move_to_username!]?.entity?.position;

    if (!playerPos) {
      signale.warn(`did not find player "${move_to_username}" position nearby`);
      return resolve(undefined);
    }

    moveTo(bot!, new goals.GoalNear(playerPos.x, playerPos.y, playerPos.z, 1))
      .then(() => resolve(undefined))
      .catch(() => resolve(undefined));

    return undefined;
  });
}
