require('dotenv').config();

import signale from 'signale';
import { assign, interpret, Machine } from 'xstate';

import { lookAround } from './utils/look-around';
import { followPlayer } from './utils/follow-player';
import { moveToPlayer } from './utils/move-to-player';
import { initialize } from './utils/initialize';
import { listenChatCommands } from './utils/commands';
import { waitForStop } from './utils/wait-for-stop';
import { collectGroundItems } from './utils/collect-ground-items';
import { deposit } from './utils/deposit';
import * as farm from './utils/farm';

import { BotMachineContext, BotMachineEvent } from './types';

// eslint-disable-next-line new-cap
const botMachine = Machine<BotMachineContext, BotMachineEvent>(
  {
    id: 'bot',
    initial: 'logged_out',
    context: {},

    states: {
      logged_out: {
        on: { LOGIN: 'logging_in' },
      },

      logging_in: {
        invoke: {
          id: 'login',
          src: 'initialize',
          onDone: {
            target: 'listening_chat_commands',
            actions: assign({
              bot: (_context, event) => event.data.bot,
              mcData: (_context, event) => event.data.mcData,
            }),
          },
        },
      },

      listening_chat_commands: {
        id: 'listening_chat_commands',

        activities: ['lookAround'],

        invoke: {
          id: 'listen_chat_commands',
          src: 'listenChatCommands',
        },

        on: {
          FARM: 'farming',
          MOVE_TO_PLAYER: {
            target: 'moving_to_player',
            actions: assign({
              move_to_username: (_context, event) => event.data.username,
            }),
          },
          FOLLOW_PLAYER: {
            target: 'following_player',
            actions: assign({
              follow_username: (_context, event) => event.data.username,
            }),
          },
        },
      },

      moving_to_player: {
        invoke: {
          id: 'move_to_player',
          src: 'moveToPlayer',
          onDone: {
            target: 'listening_chat_commands',
            actions: 'disposeContextVariables',
          },
        },
      },

      following_player: {
        invoke: {
          id: 'follow_player',
          src: 'followPlayer',
          onDone: {
            target: 'listening_chat_commands',
            actions: 'disposeContextVariables',
          },
        },
      },

      farming: {
        initial: 'harvesting',
        invoke: {
          id: 'wait_for_stop',
          src: 'waitForStop',
          onDone: { target: 'listening_chat_commands' },
        },
        states: {
          harvesting: {
            invoke: {
              id: 'harvest',
              src: 'harvest',
              onDone: { target: 'harvesting' },
              onError: { target: 'planting' },
            },
          },
          planting: {
            invoke: {
              id: 'plant',
              src: 'plant',
              onDone: { target: 'planting' },
              onError: {
                target: 'collecting',
                actions: 'setCollectFarmItems',
              },
            },
          },
          collecting: {
            invoke: {
              id: 'collect',
              src: 'collectGroundItems',
              onDone: {
                target: 'emptying_inventory',
                actions: ['disposeContextVariables', 'setDepositFarmItems'],
              },
            },
          },
          emptying_inventory: {
            invoke: {
              id: 'deposit',
              src: deposit,
              onDone: {
                target: 'waiting',
                actions: 'disposeContextVariables',
              },
            },
          },
          waiting: {
            entry: () => signale.scope('farm').info('waiting 30 seconds...'),
            after: { [30 * 1000]: 'harvesting' },
          },
        },
      },
    },
  },
  {
    services: {
      followPlayer,
      moveToPlayer,
      initialize,
      listenChatCommands,
      waitForStop,
      collectGroundItems,
      plant: farm.plant,
      harvest: farm.harvest,
    },
    activities: {
      lookAround,
    },
    actions: {
      disposeContextVariables: (context) => {
        context.items_to_collect = [];
        context.to_deposit = [];
        context.follow_username = undefined;
        context.move_to_username = undefined;
      },
      setDepositFarmItems: farm.setDepositFarmItems,
      setCollectFarmItems: farm.setCollectFarmItems,
    },
  }
);

const botService = interpret(botMachine).onTransition((_state) => {
  // console.log(`EVENT: ${_state.event.type}`);
  // console.log(`STATE:`, _state.value);
});

botService.start();
botService.send('LOGIN');
