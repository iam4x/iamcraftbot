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
import { harvest, plant } from './utils/farm';

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
            actions: (context) => (context.move_to_username = undefined),
          },
        },
      },

      following_player: {
        invoke: {
          id: 'follow_player',
          src: 'followPlayer',
          onDone: {
            target: 'listening_chat_commands',
            actions: (context) => (context.follow_username = undefined),
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
                actions: 'collectFarmItems',
              },
            },
          },
          collecting: {
            invoke: {
              id: 'collect',
              src: 'collectGroundItems',
              onDone: {
                target: 'waiting',
                actions: 'disposeItemsToCollect',
              },
              onError: {
                target: 'waiting',
                actions: 'disposeItemsToCollect',
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
      plant,
      harvest,
      collectGroundItems,
    },
    activities: {
      lookAround,
    },
    actions: {
      collectFarmItems: (context) => {
        context.items_to_collect = [
          'wheat',
          'wheat_seeds',
          'carrot',
          'potato',
          'beetroot',
          'beetroot_seeds',
        ];
      },
      disposeItemsToCollect: (context) => {
        context.items_to_collect = [];
      },
    },
  }
);

const botService = interpret(botMachine).onTransition((_state) => {
  // console.log(`EVENT: ${_state.event.type}`);
  // console.log(`STATE:`, _state.value);
});

botService.start();
botService.send('LOGIN');
