import signale from 'signale';
import { goals } from 'mineflayer-pathfinder';

import { moveTo } from './move-to';
import { BotMachineContext } from '../types';

export async function moveToPlayer({
  bot,
  move_to_username,
}: BotMachineContext) {
  const playerPos = bot?.players[move_to_username!]?.entity?.position;

  if (!playerPos) {
    signale.warn(`did not find player "${move_to_username}" position nearby`);
    return undefined;
  }

  try {
    const goal = new goals.GoalNear(playerPos.x, playerPos.y, playerPos.z, 1);
    await moveTo(bot!, goal);
    bot?.whisper(move_to_username!, "I'm here!");
  } catch (err) {
    signale.warn(`could not come to player: ${err.message}`);
  }

  return undefined;
}
