require('dotenv').config();

import signale from 'signale';
import { interpret, Machine } from 'xstate';

import { lookAround } from './utils/look-around';
import { followPlayer } from './utils/follow-player';
import { moveToPlayer } from './utils/move-to-player';
import { initialize } from './utils/initialize';
import { listenChatCommands } from './utils/commands';
import { waitForStop } from './utils/wait-for-stop';
import { collectGroundItems } from './utils/collect-ground-items';
import { deposit } from './utils/deposit';
import { sleep } from './utils/sleep';
import { eat } from './utils/eat';
import * as farm from './utils/farm';
import * as fish from './utils/fish';

import { BotMachineContext, BotMachineEvent } from './types';

// eslint-disable-next-line new-cap
const botMachine = Machine<BotMachineContext, BotMachineEvent>(
  {
    id: 'bot',
    initial: 'initializing',
    context: {
      options: {
        eat: true,
        sleep: true,
      },
    },

    states: {
      initializing: {
        invoke: {
          id: 'login',
          src: 'initialize',
          onDone: 'listening_chat_commands',
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
          FISH: 'fishing',
          MOVE_TO_PLAYER: 'moving_to_player',
          FOLLOW_PLAYER: 'following_player',
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
          onDone: 'listening_chat_commands',
        },
        states: {
          harvesting: {
            invoke: {
              id: 'harvest',
              src: 'harvest',
              onDone: 'harvesting',
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
                target: 'planting',
                actions: 'disposeContextVariables',
              },
            },
          },
          planting: {
            invoke: {
              id: 'plant',
              src: 'plant',
              onDone: 'planting',
              onError: 'eating',
            },
          },
          eating: {
            invoke: {
              id: 'eat',
              src: 'eat',
              onDone: {
                target: 'emptying_inventory',
                actions: 'setDepositFarmItems',
              },
            },
          },
          emptying_inventory: {
            invoke: {
              id: 'deposit',
              src: 'deposit',
              onDone: {
                target: 'sleeping',
                actions: 'disposeContextVariables',
              },
            },
          },
          sleeping: {
            invoke: {
              id: 'sleep',
              src: 'sleep',
              onDone: 'waiting',
            },
          },
          waiting: {
            entry: 'logWaiting',
            activities: ['lookAround'],
            after: { 2000: 'harvesting' },
          },
        },
      },

      fishing: {
        initial: 'moving_to_water',
        invoke: {
          id: 'wait_for_stop',
          src: 'waitForStop',
          onDone: 'listening_chat_commands',
        },
        states: {
          moving_to_water: {
            invoke: {
              id: 'move_to_water',
              src: 'moveNearWater',
              onDone: 'waiting_for_fish',
              onError: '#listening_chat_commands',
            },
          },
          waiting_for_fish: {
            invoke: {
              id: 'wait_for_fish',
              src: 'waitForFish',
              onDone: {
                target: 'emptying_inventory',
                actions: 'setDepositFishingItems',
              },
              onError: '#listening_chat_commands',
            },
          },
          emptying_inventory: {
            invoke: {
              id: 'deposit',
              src: 'deposit',
              onDone: {
                target: 'eating',
                actions: 'disposeContextVariables',
              },
            },
          },
          eating: {
            invoke: {
              id: 'eat',
              src: 'eat',
              onDone: 'sleeping',
            },
          },
          sleeping: {
            invoke: {
              id: 'sleep',
              src: 'sleep',
              onDone: 'moving_to_water',
            },
          },
        },
      },
    },
  },
  {
    services: {
      eat,
      sleep,
      followPlayer,
      moveToPlayer,
      initialize,
      listenChatCommands,
      waitForStop,
      deposit,
      collectGroundItems,
      plant: farm.plant,
      harvest: farm.harvest,
      moveNearWater: fish.moveNearWater,
      waitForFish: fish.waitForFish,
    },
    activities: {
      lookAround,
    },
    actions: {
      logWaiting: () => signale.info('waiting...'),
      disposeContextVariables: (context) => {
        context.items_to_collect = [];
        context.to_deposit = [];
        context.follow_username = undefined;
        context.move_to_username = undefined;
      },
      setDepositFarmItems: farm.setDepositFarmItems,
      setCollectFarmItems: farm.setCollectFarmItems,
      setDepositFishingItems: fish.setDepositFishingItems,
    },
  }
);

const botService = interpret(botMachine).onTransition((_state) => {
  // console.log(`EVENT: ${_state.event.type}`);
  // console.log(`STATE:`, _state.value);
});

botService.start();
