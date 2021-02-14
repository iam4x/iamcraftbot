import mineflayer from 'mineflayer';
import { IndexedData } from 'minecraft-data';
import { Pathfinder } from 'mineflayer-pathfinder';

export type Stack = { name: string; count: number };

export interface Bot extends mineflayer.Bot {
  pathfinder: Pathfinder;
}

export interface BotMachineContext {
  bot?: Bot;
  mcData?: IndexedData;
  move_to_username?: string;
  follow_username?: string;
  items_to_collect?: string[];
  to_deposit?: Stack[];
  options: {
    eat: boolean;
    sleep: boolean;
  };
}

export type BotMachineEvent =
  | { type: 'LOGIN' }
  | { type: 'MOVE_TO_PLAYER' }
  | { type: 'FOLLOW_PLAYER' }
  | { type: 'FARM' }
  | { type: 'FISH' };
