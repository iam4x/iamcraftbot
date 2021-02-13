import mineflayer from 'mineflayer';
import inventoryViewer from 'mineflayer-web-inventory';
import armorManager from 'mineflayer-armor-manager';
import { IndexedData } from 'minecraft-data';
import { Movements, pathfinder } from 'mineflayer-pathfinder';

import { Bot } from '../types';

const signale = require('signale').scope('initialize');

const options = {
  host: process.env.SERVER_HOST as string,
  port: parseInt(process.env.SERVER_PORT as string, 10),
  username: process.env.USERNAME as string,
  password: process.env.PASSWORD as string,
  auth: process.env.ACCOUNT_TYPE as 'mojang' | 'microsoft',
};

export function initialize() {
  return new Promise((resolve) => {
    // initialize bot
    const bot = mineflayer.createBot(options) as Bot;
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(armorManager);

    signale.info('bot created');

    // wait for spawn event
    bot.once('spawn', () => {
      signale.info('bot spawned');

      // initialize pathfinder
      const mcData: IndexedData = require('minecraft-data')(bot.version);
      const m = new Movements(bot, mcData);
      bot.pathfinder.setMovements(m);

      // allow walking through wheat (for farmer)
      bot.pathfinder.movements.blocksToAvoid.delete(
        mcData.blocksByName.wheat!.id
      );

      // prevent bot breaks block
      bot.pathfinder.movements.canDig = false;
      bot.pathfinder.movements.blocksCantBreak = new Set(
        mcData.blocksArray.map((b) => b.id)
      );

      // initialize webInventory
      inventoryViewer(bot, { host: '0.0.0.0', port: 3080 });

      // save bot instance
      // save mcData for version
      return resolve({ bot, mcData });
    });

    bot.on('error', (err: Error) => {
      signale.error(err);
    });
  });
}
