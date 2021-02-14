import signale from 'signale';
import { shuffle } from 'lodash';
import { goals } from 'mineflayer-pathfinder';
import { IndexedData } from 'minecraft-data';
import { Vec3 } from 'vec3';

import { moveTo } from './move-to';
import { trySelectAnyItem } from './select-any-item';

import { BotMachineContext } from '../types';

export const TO_HARVEST = [
  { name: 'wheat', metadata: 7, seed: 'wheat_seeds' },
  { name: 'carrots', metadata: 7, seed: 'carrot' },
  { name: 'beetroots', metadata: 3, seed: 'beetroot_seeds' },
  { name: 'potatoes', metadata: 7, seed: 'potato' },
];

function getSeedsIds(data: IndexedData) {
  return shuffle(data.itemsArray)
    .filter((item) => TO_HARVEST.some(({ seed }) => item.name === seed))
    .map((item) => item.id);
}

export async function harvest({
  bot,
  mcData,
}: BotMachineContext): Promise<void> {
  const blockToHarvest = bot?.findBlock({
    useExtraInfo: true,
    maxDistance: 32,
    matching: (b) =>
      TO_HARVEST.some(
        ({ name, metadata }) => name === b.name && metadata === b.metadata
      ),
  });

  if (!blockToHarvest) {
    signale.info('no blocks found to harvest');
    throw new Error('no blocks found to harvest');
  }

  // signale.info('found block to harvest and plant');

  await moveTo(
    bot!,
    new goals.GoalGetToBlock(
      blockToHarvest.position.x,
      blockToHarvest.position.y,
      blockToHarvest.position.z
    )
  );

  await bot?.dig(blockToHarvest, true).catch((err) => signale.warn(err));

  const { seed } = TO_HARVEST.find(({ name }) => name === blockToHarvest.name)!;
  const seedId = mcData?.itemsByName[seed]?.id;

  const hasSeeds = await bot
    ?.equip(seedId as any, 'hand')
    .then(() => true)
    .catch(() => {
      signale.info('bot has no seeds to plant');
      return false;
    });

  if (hasSeeds) {
    try {
      await bot?.placeBlock(blockToHarvest, new Vec3(0, 1, 0));
    } catch {
      // it throws error but
      // the operation has been done, idk why "block still air?"
    }
  }

  return undefined;
}

export async function plant({ bot, mcData }: BotMachineContext): Promise<void> {
  const blockToPlant = bot?.findBlock({
    useExtraInfo: true,
    maxDistance: 32,
    matching: (b) => {
      if (b && b.type === mcData?.blocksByName.farmland!.id) {
        const blockAbove = bot?.blockAt(b.position.offset(0, 1, 0));
        return !blockAbove || blockAbove.type === 0;
      }
      return false;
    },
  });

  if (!blockToPlant) {
    signale.info('no blocks found to plant');
    throw new Error('no blocks found to plant');
  }

  // signale.info('found block to plant');

  if (blockToPlant.position.distanceTo(bot!.entity.position) > 2) {
    const { success } = await moveTo(
      bot!,
      new goals.GoalGetToBlock(
        blockToPlant.position.x,
        blockToPlant.position.y,
        blockToPlant.position.z
      )
    );

    if (
      !success &&
      blockToPlant.position.distanceTo(bot!.entity.position) > 2
    ) {
      signale.warn('could not move to farmland');
      throw new Error('could not move to farmland');
    }
  }

  const hasSeeds = await trySelectAnyItem(bot!, getSeedsIds(mcData!));

  if (hasSeeds) {
    await bot
      ?.placeBlock(blockToPlant, new Vec3(0, 1, 0))
      .catch(() => signale.warn('could not plant farmland'));
  }

  return undefined;
}

export function setCollectFarmItems(context: BotMachineContext) {
  context.items_to_collect = [
    'wheat',
    'wheat_seeds',
    'carrot',
    'potato',
    'beetroot',
    'beetroot_seeds',
  ];
}

export function setDepositFarmItems(context: BotMachineContext) {
  const toKeep = TO_HARVEST.map(({ seed }) => seed);
  const inventoryStacks = context.bot!.inventory.slots.reduce(
    (result, item) => {
      if (
        TO_HARVEST.some(
          (toHarvestItem) =>
            item?.name === toHarvestItem.name ||
            item?.name === toHarvestItem.seed
        )
      ) {
        return {
          ...result,
          [item.name]: (result[item.name] || 0) + item.count,
        };
      }
      return result;
    },
    {} as Record<string, number>
  );

  const toDeposit = Object.entries(inventoryStacks)
    .map(([item, count]) =>
      toKeep.includes(item)
        ? { name: item, count: count - 32 }
        : { name: item, count }
    )
    .filter(({ count }) => count > 0);

  context.to_deposit = toDeposit;
}
