/**
 * Discord Bot - Main Entry Point
 * 
 * This file should initialize the Discord client and set up the bot infrastructure.
 * 
 * Key responsibilities:
 * - Load environment variables
 * - Initialize logger
 * - Create queue manager
 * - Initialize Discord client with proper intents
 * - Register commands
 * - Load event handlers
 * - Handle graceful shutdown
 * 
 * Example structure:
 * ```typescript
 * import { Client, GatewayIntentBits } from 'discord.js';
 * import { BotQueueManager, initLogger } from '@ask-starknet/shared';
 * 
 * const client = new Client({
 *   intents: [
 *     GatewayIntentBits.Guilds,
 *     GatewayIntentBits.GuildMessages,
 *     GatewayIntentBits.MessageContent,
 *   ],
 * });
 * 
 * // Load commands, events, etc.
 * ```
 */

// TODO: Implement Discord bot initialization
/**
 * Discord Bot - Main Entry Point
 *
 * Initializes environment, logger, queue manager, Discord client, and loads bot modules.
 * Handles graceful shutdown.
 */

import 'dotenv/config';
import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
} from 'discord.js';
import { BotQueueManager, initLogger, getLogger } from '@ask-starknet/shared';
import { loadCommands } from './utils/commandLoader';
import { loadEvents } from './utils/eventLoader';

// Extend the Discord client at runtime to carry shared services
export type ClientWithServices = Client & {
  queueManager?: BotQueueManager<any>;
  isShuttingDown?: boolean;
};

async function main() {
  // Load env and validate required values
  const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
  if (!DISCORD_TOKEN) {
    // Use console in case logger is not ready yet
    // eslint-disable-next-line no-console
    console.error('Missing DISCORD_TOKEN in environment');
    process.exit(1);
  }

  // Initialize logger early
  initLogger({ level: process.env.LOG_LEVEL || 'info' });
  const log = getLogger('bot:index');

  // Create Discord client with required intents
  const client: ClientWithServices = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  // Initialize the queue manager and worker
  try {
    // Pass env-based config. If your shared package exposes a schema, validate before this point.
    // @ts-ignore - allow env-as-config until a typed config wrapper is added
    const queueManager = new BotQueueManager(process.env as any);
    // @ts-ignore - start worker with same config
    await queueManager.startWorker(process.env as any);
    client.queueManager = queueManager;
    log.info('Queue worker started');
  } catch (err) {
    log.error({ err }, 'Failed to start queue worker');
  }

  // Load commands and events (these utilities should scan folders and register handlers)
  try {
    await loadCommands(client);
    log.info('Commands loaded');
  } catch (err) {
    log.error({ err }, 'Failed to load commands');
  }

  try {
    await loadEvents(client);
    log.info('Events loaded');
  } catch (err) {
    log.error({ err }, 'Failed to load events');
  }

  // Discord lifecycle
  client.once('ready', () => {
    log.info({ user: client.user?.tag }, 'Bot connected');
    client.user?.setPresence({
      activities: [{ name: '/ask about Starknet', type: ActivityType.Listening }],
      status: 'online',
    });
  });

  // Process-level guards
  process.on('unhandledRejection', (reason) => {
    log.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (error) => {
    log.error({ error }, 'Uncaught exception');
    void shutdown(client, 1);
  });

  // Graceful shutdown hooks
  process.once('SIGINT', () => void shutdown(client, 0));
  process.once('SIGTERM', () => void shutdown(client, 0));

  // Login
  try {
    await client.login(DISCORD_TOKEN);
  } catch (err) {
    log.error({ err }, 'Discord login failed');
    process.exit(1);
  }
}

async function shutdown(client: ClientWithServices, code = 0) {
  const log = getLogger('bot:shutdown');
  if (client.isShuttingDown) return;
  client.isShuttingDown = true;

  log.info('Shutting down');

  try {
    const qm = client.queueManager as any;
    if (qm && typeof qm.stopWorker === 'function') {
      await qm.stopWorker();
      log.info('Queue worker stopped');
    }
  } catch (err) {
    log.error({ err }, 'Error while stopping queue worker');
  }

  try {
    await client.destroy();
    log.info('Discord client destroyed');
  } catch (err) {
    log.error({ err }, 'Error while destroying Discord client');
  }

  process.exit(code);
}

main().catch((err) => {
  try {
    getLogger('bot:index').error({ err }, 'Startup failure');
  } catch {
    // eslint-disable-next-line no-console
    console.error('Startup failure', err);
  }
  process.exit(1);
});

export {};

