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

/**
 * Discord Bot - Main Entry Point
 */
import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
} from 'discord.js';
import { BotQueueManager, initLogger, getLogger } from '@ask-starknet/shared';
import { loadCommands } from './utils/commandLoader';
import { loadEvents } from './utils/eventLoader';

export type ClientWithServices = Client & {
  queueManager?: BotQueueManager;
  isShuttingDown?: boolean;
};

// ---- helpers ----
const parseArgList = (s?: string): string[] => {
  if (!s) return [];
  // JSON array support
  if (/^\s*\[/.test(s)) {
    try { return JSON.parse(s); } catch { /* fall through */ }
  }
  // space-separated with optional quotes
  const tokens = s.match(/(?:[^\s"]+|"[^"]*")+/g);
  return (tokens || []).map(t => t.replace(/^"|"$/g, ''));
};

const parseEnvMap = (s?: string): Record<string, string> | undefined => {
  if (!s) return undefined;
  // JSON object support
  if (/^\s*\{/.test(s)) {
    try { return JSON.parse(s); } catch { /* fall through */ }
  }
  // KEY=VAL or KEY:VAL separated by commas or newlines
  const out: Record<string, string> = {};
  s.split(/[,\n]+/).map(x => x.trim()).filter(Boolean).forEach(pair => {
    const m = pair.match(/^([^:=\s]+)\s*[:=]\s*(.+)$/);
    if (m) out[m[1]] = m[2];
  });
  return Object.keys(out).length ? out : undefined;
};

type RedisConfig = {
  host: string;
  port: number;
  password?: string;
  username?: string;
  tls?: Record<string, unknown>;
};

const buildRedisConfig = (): RedisConfig => {
  const url = process.env.REDIS_URL;
  if (url) {
    const u = new URL(url);
    const isTls = u.protocol === 'rediss:';
    return {
      host: u.hostname,
      port: Number(u.port || 6379),
      username: u.username || undefined,
      password: u.password || undefined,
      tls: isTls ? {} : undefined,
    };
  }
  return {
    host: process.env.REDIS_HOST || (process.env.DOCKER === 'true' ? 'redis' : '127.0.0.1'),
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  };
};

// ---- main ----
async function main() {
  const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
  if (!DISCORD_TOKEN) {
    // eslint-disable-next-line no-console
    console.error('Missing DISCORD_TOKEN in environment');
    process.exit(1);
  }

  initLogger({ level: process.env.LOG_LEVEL || 'info' });
  const log = getLogger();

  const client: ClientWithServices = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  // Queue + worker
  try {
    const redis = buildRedisConfig();

    const queueConfig: any = {
      redis,
      mcpServer: {
        // If you have a binary, set MCP_COMMAND in .env
        command: process.env.MCP_COMMAND || 'node',
        // Your .env provides the MCP server address here. Accept JSON array or space-separated string.
        // Examples:
        // MCP_ARGS=["server.js","--addr","127.0.0.1:3000"]
        // MCP_ARGS=server.js --addr 127.0.0.1:3000
        args: parseArgList(process.env.MCP_ARGS),
        // Your .env provides API KEY and ENV:production here.
        // Examples:
        // MCP_ENV={"API_KEY":"xxx","ENV":"production"}
        // MCP_ENV=API_KEY=xxx,ENV=production
        env: parseEnvMap(process.env.MCP_ENV),
      },
    };

    const queueManager = new BotQueueManager(queueConfig);
    await queueManager.startWorker(queueConfig);
    client.queueManager = queueManager;
    log.info('Queue worker started');
  } catch (err) {
    log.error({ err }, 'Failed to start queue worker');
  }

  // Commands and events
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

  process.on('unhandledRejection', (reason) => {
    log.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (error) => {
    log.error({ error }, 'Uncaught exception');
    void shutdown(client, 1);
  });
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
  const log = getLogger();
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
  try { getLogger().error({ err }, 'Startup failure'); }
  catch { /* eslint-disable-next-line no-console */ console.error('Startup failure', err); }
  process.exit(1);
});

export {};
