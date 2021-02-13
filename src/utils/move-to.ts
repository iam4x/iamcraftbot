/* eslint @typescript-eslint/no-use-before-define: off */
import { goals } from 'mineflayer-pathfinder';
import { Bot } from '../types';

const signale = require('signale').scope('moveTo');

export function moveTo(
  bot: Bot,
  goal: goals.Goal,
  options?: { tries?: number; timeout?: number }
) {
  return new Promise((resolve) => {
    const { x, y, z } = goal as any;

    let tries = 0;
    let lastNumberOfMoves = 0;

    const onPathUpdate = (r: any) => {
      if (lastNumberOfMoves === r.path.length) {
        tries += 1;
        signale.warn(`bot pathfinding try #${tries}`);
      }

      if (tries >= (options?.tries || 10) || r.status === 'noPath') {
        signale.warn(`bot could not reach goal`);
        return cleanup();
      }

      lastNumberOfMoves = r.path.length;
      return undefined;
    };

    const onGoalUpdated = () => {
      signale.warn('bot changed pathfinding goal');
      return cleanup();
    };

    const onGoalReached = () => cleanup();

    let timeout: NodeJS.Timeout | null = setTimeout(() => {
      signale.warn('bot pathfinding timeout');
      return cleanup();
    }, options?.timeout || 5000);

    const cleanup = () => {
      bot?.off('path_update' as any, onPathUpdate);
      bot?.off('goal_reached' as any, onGoalReached);
      bot?.off('goal_updated' as any, onGoalUpdated);

      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      bot?.pathfinder.setGoal(null as any);
      return resolve(undefined);
    };

    bot?.on('path_update' as any, onPathUpdate);
    bot?.once('goal_reached' as any, onGoalReached);

    signale.info(`bot pathfinding { x: ${x} y: ${y} z: ${z} }`);
    bot?.pathfinder.setGoal(goal);

    bot?.once('goal_updated' as any, onGoalUpdated);
  });
}
