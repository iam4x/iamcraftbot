/* eslint @typescript-eslint/no-use-before-define: off */
import signale from 'signale';
import { goals } from 'mineflayer-pathfinder';
import { Vec3 } from 'vec3';

import { Bot } from '../types';

const positionToString = (pos: Vec3) =>
  `{ x: ${Math.round(pos.x)} y: ${Math.round(pos.y)} z: ${Math.round(pos.z)} }`;

export function moveTo(
  bot: Bot,
  goal: goals.Goal,
  options?: { tries?: number; timeout?: number }
) {
  return new Promise<{ success: boolean }>((resolve) => {
    let tries = 0;
    let lastNumberOfMoves = 0;

    const onPathUpdate = (r: any) => {
      if (lastNumberOfMoves === r.path.length) {
        tries += 1;
        signale.warn(`bot pathfinding try #${tries}`);
      }

      if (tries >= (options?.tries || 10) || r.status === 'noPath') {
        signale.warn(`bot could not reach goal`);
        return cleanup({ success: false });
      }

      lastNumberOfMoves = r.path.length;
      return undefined;
    };

    const onGoalUpdated = () => {
      signale.warn('bot changed pathfinding goal');
      return cleanup({ success: false });
    };

    const onGoalReached = () => cleanup({ success: true });

    let timeout: NodeJS.Timeout | null = setTimeout(() => {
      signale.warn('bot pathfinding timeout');
      return cleanup({ success: false });
    }, options?.timeout || 5000);

    const cleanup = ({ success }: { success: boolean }) => {
      bot?.off('path_update' as any, onPathUpdate);
      bot?.off('goal_reached' as any, onGoalReached);
      bot?.off('goal_updated' as any, onGoalUpdated);

      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      bot?.pathfinder.setGoal(null as any);
      return resolve({ success });
    };

    bot?.on('path_update' as any, onPathUpdate);
    bot?.once('goal_reached' as any, onGoalReached);

    const origin = positionToString(bot.entity.position);
    const dest = positionToString(goal as any);
    signale.info(`bot pathfinding ${origin} -> ${dest}`);

    bot?.pathfinder.setGoal(goal);

    bot?.once('goal_updated' as any, onGoalUpdated);
  });
}
