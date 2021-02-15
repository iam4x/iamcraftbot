import signale from 'signale';
import { isEqual } from 'lodash';
import { goals } from 'mineflayer-pathfinder';

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

  await bot!.lookAt(nearestWaterBlock.position.offset(0, 0.8, 0));
  return undefined;
}

const bestEnchants = {
  luck_of_the_sea: 3,
  mending: 1,
  unbreaking: 3,
};

export async function waitForFish({ bot }: BotMachineContext) {
  const bestFishingRod = bot!.inventory
    .items()
    // remove other than fishing_rod items
    .filter((item) => item.name === 'fishing_rod')
    // map to item and accessible enchants object
    .map((item) => {
      const enchantements: Record<string, number> = Object.fromEntries(
        (item?.nbt as any)?.value?.Enchantments?.value?.value?.map(
          ({ id, lvl }: any) => [id.value.replace('minecraft:', ''), lvl.value]
        ) || []
      );

      signale.info(`found fishing_rod: ${JSON.stringify(enchantements)}`);

      return { item, enchantements };
    })
    // compare fishing rod by enchants
    .reduce<{ item: any; enchantements: Record<string, number> } | undefined>(
      (result, fishingRod) => {
        if (!result) return fishingRod;

        // best enchants possible
        if (isEqual(result.enchantements, bestEnchants)) return result;
        if (isEqual(fishingRod.enchantements, bestEnchants)) return fishingRod;

        const currCount = Object.entries(result.enchantements).length;
        const nextCount = Object.entries(fishingRod.enchantements).length;

        // will take the fishing rod with most enchants
        // and the biggest enchant level for each
        if (nextCount > currCount || currCount === nextCount) {
          return Object.entries(fishingRod.enchantements).every(
            ([id, lvl]) => lvl >= (result.enchantements[id] || 0)
          )
            ? fishingRod
            : result;
        }

        return result;
      },
      undefined
    );

  if (!bestFishingRod) {
    const err = new Error('does not have fishing rod');
    signale.warn(err.message);
    throw err;
  }

  try {
    signale.info(
      `equip fishing rod ${JSON.stringify(bestFishingRod.enchantements)}`
    );
    await bot!.equip(bestFishingRod.item, 'hand');
  } catch (err) {
    signale.warn(`could not equip fishing rod: ${err.message}`);
    throw err;
  }

  // sometimes shit happens, hook is going into ground instead of water
  // and we can wait for ever to catch something...
  const timedOutFishing = () =>
    new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('timed out')),
        30 * 1000
      );
      bot!.fish((err) => {
        clearTimeout(timeout);
        return err ? reject(err) : resolve(undefined);
      });
    });

  try {
    await timedOutFishing();
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

  // keep fishing rods in inventory until we can
  // deposit a specific one (see: https://github.com/PrismarineJS/mineflayer/issues/1388)
  if ('fishing_rod' in inventoryStacks) {
    delete inventoryStacks.fishing_rod;
  }

  const toDeposit = Object.entries(inventoryStacks)
    .filter(([item]) => !ACCEPTABLE_FOOD.includes(item))
    .map(([item, count]) => ({ name: item, count }));

  context.to_deposit = toDeposit;
}
