import signale from 'signale';
import { goals } from 'mineflayer-pathfinder';

import { moveTo } from './move-to';
import { BotMachineContext } from '../types';

export async function sleep({ bot, options }: BotMachineContext) {
  if (options.sleep === false) {
    signale.info('sleep is disabled, continue');
    return undefined;
  }

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

  try {
    await bot!.sleep(bed);
  } catch (err) {
    signale.warn(`cant sleep: ${err.message}`);
    return undefined;
  }

  let loops = 0;
  const waitForDay = () =>
    new Promise((resolve) => {
      const loop = () => {
        if (bot?.time.isDay || ++loops > 3) {
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
