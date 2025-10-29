/**
 * Event Loader Utility
 * 
 * This utility should load all event handler files from the events directory
 * and register them with the Discord client.
 * 
 * Responsibilities:
 * 1. Read all files from events directory
 * 2. Import each event module
 * 3. Validate event structure
 * 4. Register event listeners (once or on)
 * 5. Log loaded events
 * 
 * Example implementation:
 * ```typescript
 * import * as fs from 'fs';
 * import * as path from 'path';
 * import { ExtendedClient, Event } from '../types';
 * 
 * export async function loadEvents(client: ExtendedClient) {
 *   const eventsPath = path.join(__dirname, '../events');
 *   const eventFiles = fs.readdirSync(eventsPath).filter(file =>
 *     file.endsWith('.js') || file.endsWith('.ts')
 *   );
 *   
 *   for (const file of eventFiles) {
 *     const filePath = path.join(eventsPath, file);
 *     const event: Event = require(filePath).default;
 *     
 *     if (event.once) {
 *       client.once(event.name, (...args) => event.execute(...args));
 *     } else {
 *       client.on(event.name, (...args) => event.execute(...args));
 *     }
 *     
 *     console.log(`Loaded event: ${event.name}`);
 *   }
 * }
 * ```
 */

// TODO: Implement event loader
/**
 * Event Loader Utility
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { getLogger } from '@ask-starknet/shared';
import type { Event } from '../types';

const log = getLogger();

export async function loadEvents(client: any) {
  const eventsPath = path.join(__dirname, '..', 'events');

  let files: string[] = [];
  try {
    files = await fs.readdir(eventsPath);
  } catch (err) {
    log.error({ err, eventsPath }, 'Failed to read events directory');
    return;
  }

  const eventFiles = files.filter(
    (f) =>
      /\.(ts|js|mjs|cjs)$/.test(f) &&
      !f.endsWith('.d.ts') &&
      !f.endsWith('.map') &&
      !f.startsWith('_'),
  );

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      const mod = await import(pathToFileURL(filePath).href);
      const event: Event | undefined =
        (mod && (mod.default || mod.event || mod[Object.keys(mod).find((k) => /Event$/i.test(k))!])) as Event | undefined;

      if (!event || typeof event.execute !== 'function' || !event.name) {
        log.warn({ file }, 'Invalid event module');
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args: any[]) => void event.execute(...args));
      } else {
        client.on(event.name, (...args: any[]) => void event.execute(...args));
      }

      log.info({ name: event.name, file, once: !!event.once }, 'Loaded event');
    } catch (err) {
      log.error({ err, file }, 'Failed to load event');
    }
  }
}

export default loadEvents;


