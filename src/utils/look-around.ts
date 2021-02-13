import { BotMachineContext } from '../types';

export function lookAround({ bot }: BotMachineContext) {
  const interval = setInterval(() => {
    const entity = bot?.nearestEntity();
    if (entity?.type === 'player') {
      bot?.lookAt(entity.position.offset(0, 1.6, 0));
    } else if (entity?.type === 'mob') {
      bot?.lookAt(entity.position);
    }
  }, 100);
  return () => clearInterval(interval);
}
