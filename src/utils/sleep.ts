import { goals } from 'mineflayer-pathfinder';
import signale from 'signale';

import { moveTo } from './move-to';
import { BotMachineContext } from '../types';

export async function sleep({ bot }: BotMachineContext) {
  if (bot!.time.isDay) {
    signale.info('daytime, wont sleep');
    return undefined;
  }

  const bed = bot!.findBlock({
    useExtraInfo: true,
    maxDistance: 32,
    matching: (block) => (bot!.isABed(block) as unknown) as boolean,
  });

  if (!bed) {
    signale.warn('did not find any bed nearby');
    return undefined;
  }

  if (bed.position.distanceTo(bot!.entity.position) > 3) {
    const { x, y, z } = bed.position;
    const { success } = await moveTo(bot!, new goals.GoalGetToBlock(x, y, z));

    if (!success && bed.position.distanceTo(bot!.entity.position) > 3) {
      signale.warn('cant reach nearest bed');
      return undefined;
    }
  }

  await bot!
    .sleep(bed)
    .catch((err) => signale.warn(`cant sleep: ${err.message}`));

  const waitForDay = () =>
    new Promise((resolve) => {
      const loop = () => {
        if (bot?.time.isDay) {
          bot
            .wake()
            .then(() => resolve(undefined))
            .catch(() => resolve(undefined));
        } else {
          signale.info('sleeping zzz...');
          setTimeout(() => loop(), 5000);
        }
      };
      loop();
    });

  await waitForDay();

  return undefined;
}
