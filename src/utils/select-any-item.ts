import { Bot } from '../types';

export function trySelectAnyItem(bot: Bot, itemsIds: number[]) {
  function tryItem(itemId: number): Promise<boolean> {
    return bot
      .equip(itemId as any, 'hand')
      .then(() => true)
      .catch(() => {
        const nextItem =
          itemsIds.indexOf(itemId) === itemsIds.length - 1
            ? false
            : itemsIds[itemsIds.indexOf(itemId) + 1];
        return nextItem ? tryItem(nextItem) : false;
      });
  }

  return tryItem(itemsIds[0]);
}
