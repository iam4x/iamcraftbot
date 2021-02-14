require('dotenv').config();

import signale from 'signale';
import { interpret, Machine, send } from 'xstate';

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
import { listenDisconnect } from './utils/listen-disconnect';
import * as farm from './utils/farm';
import * as fish from './utils/fish';

import { BotMachineContext, BotMachineEvent } from './types';

// eslint-disable-next-line new-cap
const botMachine = Machine<BotMachineContext, BotMachineEvent>(
  {
    id: 'bot',
    initial: 'loggedOut',
    context: {
      operators: [],
      options: {
        eat: true,
        sleep: true,
      },
    },

    states: {
      loggedOut: {
        id: 'loggedOut',
        initial: 'loggingIn',
        states: {
          loggingIn: {
            invoke: {
              id: 'login',
              src: 'initialize',
              onDone: '#inGame',
              onError: 'retryConnection',
            },
          },
          retryConnection: {
            after: { 5000: 'loggingIn' },
          },
        },
      },

      inGame: {
        id: 'inGame',
        initial: 'restoringActivity',
        invoke: {
          id: 'listenDisconnect',
          src: 'listenDisconnect',
          onDone: { target: '.disconnected' },
        },
        states: {
          disconnected: {
            after: { 5000: '#loggedOut' },
          },

          restoringActivity: {
            id: 'restoringActivity',
            always: [
              { target: 'farming', cond: ({ farming }) => farming === true },
              { target: 'fishing', cond: ({ fishing }) => fishing === true },
              { target: 'waitingForCommand' },
            ],
          },

          waitingForCommand: {
            id: 'waitingForCommand',
            activities: ['lookAround'],
            invoke: {
              id: 'listen_chat_commands',
              src: 'listenChatCommands',
            },
            on: {
              FARM: 'farming',
              FISH: 'fishing',
              MOVE_TO_PLAYER: 'movingToPlayer',
              FOLLOW_PLAYER: 'followingPlayer',
            },
          },

          movingToPlayer: {
            invoke: {
              id: 'moveToPlayer',
              src: 'moveToPlayer',
              onDone: {
                target: 'waitingForCommand',
                actions: 'disposeContextVariables',
              },
            },
          },

          followingPlayer: {
            invoke: {
              id: 'followPlayer',
              src: 'followPlayer',
              onDone: {
                target: 'waitingForCommand',
                actions: 'disposeContextVariables',
              },
            },
          },

          farming: {
            initial: 'harvesting',
            entry: (context) => (context.farming = true),
            invoke: {
              id: 'waitForStop',
              src: 'waitForStop',
            },
            on: {
              STOP: {
                target: '#waitingForCommand',
                actions: (context) => (context.farming = false),
              },
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
                    target: 'emptyingInventory',
                    actions: 'setDepositFarmItems',
                  },
                },
              },
              emptyingInventory: {
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
            initial: 'movingNearWater',
            entry: (context) => (context.fishing = true),
            invoke: {
              id: 'waitForStop',
              src: 'waitForStop',
            },
            on: {
              STOP: {
                target: '#waitingForCommand',
                actions: (context) => (context.fishing = false),
              },
            },
            states: {
              movingNearWater: {
                invoke: {
                  id: 'moveNearWater',
                  src: 'moveNearWater',
                  onDone: 'waitingForFish',
                  onError: {
                    actions: send('ERROR', { to: 'waitForStop' }),
                  },
                },
              },
              waitingForFish: {
                invoke: {
                  id: 'waitForFish',
                  src: 'waitForFish',
                  onDone: {
                    target: 'emptyingInventory',
                    actions: 'setDepositFishingItems',
                  },
                  onError: {
                    actions: send('ERROR', { to: 'waitForStop' }),
                  },
                },
              },
              emptyingInventory: {
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
                  onDone: 'movingNearWater',
                },
              },
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
      listenDisconnect,
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
