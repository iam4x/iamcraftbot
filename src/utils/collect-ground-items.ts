import signale from 'signale';
import { goals } from 'mineflayer-pathfinder';

import { moveTo } from './move-to';
import { BotMachineContext } from '../types';

export async function collectGroundItems({
  bot,
  mcData,
  items_to_collect: items,
}: BotMachineContext) {
  const itemIds = items?.map(
    (name) => mcData?.itemsArray.find((i) => i.name === name)!.id
  );

  const droppedItems = Object.values(bot!.entities).filter(
    (entity) =>
      entity.kind === 'Drops' &&
      itemIds?.includes((entity.metadata[7] as any).itemId)
  );

  signale.info(`found ${droppedItems.length} items to collect`);

  for (const item of droppedItems) {
    if (item.position.distanceTo(bot!.entity.position) > 1) {
      await moveTo(
        bot!,
        new goals.GoalNear(
          item.position.x,
          item.position.y,
          item.position.z,
          1
        ),
        {
          tries: 3,
          timeout: 3000,
        }
      );
    }
  }
}
