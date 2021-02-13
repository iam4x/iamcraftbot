import { sum, take, times } from 'lodash';
import { goals } from 'mineflayer-pathfinder';
import { BotMachineContext, Stack } from '../types';
import { moveTo } from './move-to';

const signale = require('signale').scope('deposit');

// TODO: loop through near chests to find place
// TODO: chest keep inventory sorted

export async function deposit({ bot, mcData, to_deposit }: BotMachineContext) {
  const nearestChest = bot?.findBlock({
    useExtraInfo: true,
    matching: mcData!.blocksByName.chest!.id,
  });

  if (!nearestChest) {
    signale.warn('did not find any chest nearby to deposit');
    return undefined;
  }

  const { x, y, z } = nearestChest.position;
  await moveTo(bot!, new goals.GoalNear(x, y, z, 3));

  const chest = await bot?.openChest(nearestChest);
  const chestSize = (chest as any).type === 'minecraft:generic_9x6' ? 54 : 27;

  const items = (chest as any).containerItems() || [];
  const remainingSlots = chestSize - items.length;

  if (remainingSlots === 0) {
    signale.warn('nearest chest is full');
    return undefined;
  }

  const stacks = to_deposit?.reduce((result, { name, count }) => {
    const inIventoryCount = sum(
      bot?.inventory.slots
        .filter((item) => item?.name === name)
        .map((item) => item?.count)
    );

    const willDepositCount = inIventoryCount > count ? count : inIventoryCount;

    if (willDepositCount > 64) {
      const arr = times(Math.round(willDepositCount / 64), (index) => ({
        name,
        count:
          (index + 1) * 64 > willDepositCount
            ? 64 - ((index + 1) * 64 - willDepositCount)
            : 64,
      }));

      return [...result, ...arr];
    }

    if (willDepositCount > 0) {
      return [...result, { name, count: willDepositCount }];
    }

    return result;
  }, [] as Stack[]);

  if (!stacks?.length) {
    signale.warn('no items found to deposit');
    return undefined;
  }

  for (const stack of take(stacks, remainingSlots)) {
    signale.info(`deposit [${stack.name} x ${stack.count}]`);
    await chest?.deposit(
      mcData?.itemsByName[stack.name].id!,
      null,
      stack.count
    );
  }

  await chest?.close();

  return undefined;
}
