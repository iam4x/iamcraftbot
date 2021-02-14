import signale from 'signale';
import { map, orderBy } from 'lodash';

import { trySelectAnyItem } from './select-any-item';
import { BotMachineContext } from '../types';

export const MINIMUM_FOOD_LEVEL = 16;
export const ACCEPTABLE_FOOD = ['carrot', 'beetroot', 'bread', 'potato'];

export async function eat({ bot, mcData, options }: BotMachineContext) {
  if (options.eat === false) {
    signale.info('eat is disabled, continue');
    return undefined;
  }

  if (bot!.food > MINIMUM_FOOD_LEVEL) {
    signale.info(`food level at ${bot!.food}, wont eat`);
    return undefined;
  }

  const inventoryFood = bot!.inventory.slots
    .filter((item) => ACCEPTABLE_FOOD.includes(item?.name))
    .map((item) => mcData!.itemsByName[item.name]);

  if (!inventoryFood?.length) {
    signale.warn('did not have any food in inventory');
    return undefined;
  }

  const foodIds = map(orderBy(inventoryFood, 'foodPoints'), 'id');
  const recursiveEat = async (): Promise<void> => {
    const selectedFood = await trySelectAnyItem(bot!, foodIds);

    if (!selectedFood) {
      signale.warn('could not equip food in hand');
      return undefined;
    }

    try {
      signale.info(`bot is having lunch`);
      await bot!.consume(undefined as any);
    } catch (err) {
      signale.warn(`could not eat: ${err.message}`);
      return undefined;
    }

    if (bot!.food < MINIMUM_FOOD_LEVEL) {
      return recursiveEat();
    }

    return undefined;
  };

  await recursiveEat();

  return undefined;
}
