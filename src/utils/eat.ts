import signale from 'signale';
import { map, orderBy } from 'lodash';

import { trySelectAnyItem } from './select-any-item';
import { BotMachineContext } from '../types';

const MINIMUM_FOOD_LEVEL = 16;

export async function eat({ bot, mcData }: BotMachineContext) {
  if (bot!.food > MINIMUM_FOOD_LEVEL) {
    signale.log(`food level at ${bot!.food}, wont eat`);
    return undefined;
  }

  const inventoryFood = bot!.inventory.slots
    .filter((item) =>
      mcData!.foodsArray.some((food) => item?.name === food.name)
    )
    .map((item) => mcData!.foodsByName[item.name]);

  if (!inventoryFood?.length) {
    signale.warn('did not have any food in inventory');
    return undefined;
  }

  const foodIds = map(orderBy(inventoryFood, 'foodPoints'), 'id');
  const recursiveEat = async (): Promise<void> => {
    try {
      signale.log(`bot is having lunch`);
      await trySelectAnyItem(bot!, foodIds);
      await bot!.consume(undefined as any);
    } catch (err) {
      signale.warn(`could not eat: ${err.message}`);
      return undefined;
    }
    return bot!.food > MINIMUM_FOOD_LEVEL ? undefined : recursiveEat();
  };

  await recursiveEat();

  return undefined;
}
