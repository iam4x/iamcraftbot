import signale from 'signale';
import { sum, take, times } from 'lodash';
import { goals } from 'mineflayer-pathfinder';

import { moveTo } from './move-to';
import { BotMachineContext, Stack } from '../types';

// TODO: loop through near chests to find place
// TODO: chest keep inventory sorted

export async function deposit({ bot, mcData, to_deposit }: BotMachineContext) {
  const totalCount = sum(to_deposit?.map(({ count }) => count));

  if (!totalCount) {
    signale.info('no items to deposit');
    return undefined;
  }

  const nearestChest = bot?.findBlock({
    useExtraInfo: true,
    maxDistance: 32,
    matching: mcData!.blocksByName.chest!.id,
  });

  if (!nearestChest) {
    signale.warn('did not find any chest nearby to deposit');
    return undefined;
  }

  if (nearestChest.position.distanceTo(bot!.entity.position) > 3) {
    const { x, y, z } = nearestChest.position;
    const { success } = await moveTo(bot!, new goals.GoalGetToBlock(x, y, z));

    if (
      !success &&
      nearestChest.position.distanceTo(bot!.entity.position) > 3
    ) {
      signale.warn('cant reach nearest chest');
      return undefined;
    }
  }

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
    signale.info('no items to deposit');
    return undefined;
  }

  for (const stack of take(stacks, remainingSlots)) {
    try {
      signale.info(`deposit [${stack.name} x ${stack.count}]`);
      await chest?.deposit(
        mcData?.itemsByName[stack.name].id!,
        null,
        stack.count
      );
    } catch (err) {
      signale.warn(`could not deposit [${stack.name} x ${stack.count}]`);
      signale.warn(err.message);
    }
  }

  chest?.close();
  return undefined;
}
