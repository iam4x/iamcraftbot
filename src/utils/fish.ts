import { goals } from 'mineflayer-pathfinder';
import signale from 'signale';

import { moveTo } from './move-to';
import { ACCEPTABLE_FOOD } from './eat';
import { BotMachineContext } from '../types';

export async function moveNearWater({ bot, mcData }: BotMachineContext) {
  const nearestWaterBlock = bot?.findBlock({
    useExtraInfo: true,
    maxDistance: 12,
    matching: mcData!.blocksByName.water!.id,
  });

  if (!nearestWaterBlock) {
    signale.warn('did not find any water block nearby');
    throw new Error('did not find any water block nearby');
  }

  if (nearestWaterBlock.position.distanceTo(bot!.entity.position) > 3) {
    const { x, y, z } = nearestWaterBlock.position;
    const { success } = await moveTo(bot!, new goals.GoalNear(x, y, z, 3));

    if (
      !success &&
      nearestWaterBlock.position.distanceTo(bot!.entity.position) > 3
    ) {
      signale.warn('cant reach nearest water block');
      throw new Error('cant reach nearest water block');
    }
  }

  await bot!.lookAt(nearestWaterBlock.position.offset(0, 0.6, 0));
  return undefined;
}

export async function waitForFish({ bot, mcData }: BotMachineContext) {
  const hasFishingRod = bot!.inventory
    .items()
    .some((item) => item.name === 'fishing_rod');

  if (!hasFishingRod) {
    const err = new Error('does not have fishing rod');
    signale.warn(err.message);
    throw err;
  }

  try {
    signale.info('equip fishing rod');
    await bot!.equip(mcData!.itemsByName.fishing_rod!.id as any, 'hand');
  } catch (err) {
    signale.warn(`could not equip fishing rod: ${err.message}`);
    throw err;
  }

  try {
    await bot!.fish(undefined as any);
    signale.info('caught something!');
  } catch (err) {
    signale.warn(`error while fishing: ${err.message}`);
    throw err;
  }

  return undefined;
}

export function setDepositFishingItems(context: BotMachineContext) {
  const inventoryStacks = context.bot!.inventory.items().reduce(
    (result, item) => ({
      ...result,
      [item.name]: (result[item.name] || 0) + item.count,
    }),
    {} as Record<string, number>
  );

  // keep one fishing rod in inventory
  if ('fishing_rod' in inventoryStacks) {
    inventoryStacks.fishing_rod -= 1;
  }

  const toDeposit = Object.entries(inventoryStacks)
    .filter(([item]) => !ACCEPTABLE_FOOD.includes(item))
    .map(([item, count]) => ({ name: item, count }));

  context.to_deposit = toDeposit;
}
