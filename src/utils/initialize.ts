import signale from 'signale';
import mineflayer from 'mineflayer';
import { IndexedData } from 'minecraft-data';
import { Movements, pathfinder } from 'mineflayer-pathfinder';

import { Bot, BotMachineContext } from '../types';

const options = {
  host: process.env.SERVER_HOST as string,
  port: parseInt(process.env.SERVER_PORT as string, 10),
  username: process.env.USERNAME as string,
  password: process.env.PASSWORD as string,
  auth: process.env.ACCOUNT_TYPE as 'mojang' | 'microsoft',
};

export function initialize(context: BotMachineContext) {
  return new Promise((resolve, reject) => {
    // initialize bot
    const bot = mineflayer.createBot(options) as Bot;
    bot.loadPlugin(pathfinder);

    signale.info('bot created');

    const handleConnectError = () => {
      const err = 'could not connect to server, retrying in 10 seconds...';
      signale.error(err);
      return reject(new Error(err));
    };

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

      // save bot instance
      // save mcData for version
      context.bot = bot;
      context.mcData = mcData;

      bot.off('end', handleConnectError);
      return resolve(undefined);
    });

    bot.on('end', handleConnectError);
  });
}
