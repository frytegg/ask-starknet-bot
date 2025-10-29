/**
 * Ready Event Handler
 * 
 * Event: ready
 * 
 * This event fires when the Discord client successfully connects and is ready.
 * 
 * Responsibilities:
 * 1. Log successful connection
 * 2. Set bot presence/status
 * 3. Log bot information (username, guild count, etc.)
 * 4. Register slash commands if needed
 * 
 * Example implementation:
 * ```typescript
 * import { Events, ActivityType } from 'discord.js';
 * import { Event } from '../types';
 * 
 * export const readyEvent: Event = {
 *   name: Events.ClientReady,
 *   once: true,
 *   
 *   async execute(client) {
 *     console.log(`Logged in as ${client.user.tag}`);
 *     
 *     client.user.setPresence({
 *       activities: [{ name: 'Starknet questions', type: ActivityType.Listening }],
 *       status: 'online',
 *     });
 *     
 *     console.log(`Serving ${client.guilds.cache.size} servers`);
 *   }
 * };
 * ```
 */

// TODO: Implement ready event handler
/**
 * Ready Event Handler
 */

import { Events, ActivityType, type Client } from 'discord.js';
import { getLogger } from '@ask-starknet/shared';
import type { Event } from '../types';

const log = getLogger();

export const readyEvent: Event = {
  name: Events.ClientReady,
  once: true,

  async execute(client: Client) {
    const user = client.user;
    if (!user) return;

    log.info({ tag: user.tag, id: user.id }, 'Bot ready');

    user.setPresence({
      activities: [{ name: '/ask about Starknet', type: ActivityType.Listening }],
      status: 'online',
    });

    const guildCount = client.guilds.cache.size;
    log.info({ guildCount }, 'Serving guilds');
  },
};

export default readyEvent;


