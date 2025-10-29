/**
 * Command Loader Utility
 * 
 * This utility should load all command files from the commands directory
 * and add them to the client's command collection.
 * 
 * Responsibilities:
 * 1. Read all files from commands directory
 * 2. Import each command module
 * 3. Validate command structure
 * 4. Add to client.commands collection
 * 5. Log loaded commands
 * 
 * Example implementation:
 * ```typescript
 * import { Collection } from 'discord.js';
 * import * as fs from 'fs';
 * import * as path from 'path';
 * import { Command, ExtendedClient } from '../types';
 * 
 * export async function loadCommands(client: ExtendedClient) {
 *   client.commands = new Collection();
 *   
 *   const commandsPath = path.join(__dirname, '../commands');
 *   const commandFiles = fs.readdirSync(commandsPath).filter(file => 
 *     file.endsWith('.js') || file.endsWith('.ts')
 *   );
 *   
 *   for (const file of commandFiles) {
 *     const filePath = path.join(commandsPath, file);
 *     const command: Command = require(filePath).default;
 *     
 *     if ('data' in command && 'execute' in command) {
 *       client.commands.set(command.data.name, command);
 *       console.log(`Loaded command: ${command.data.name}`);
 *     } else {
 *       console.warn(`Invalid command file: ${file}`);
 *     }
 *   }
 * }
 * ```
 */

// TODO: Implement command loader
/**
 * Command Loader Utility
 */

import { Collection } from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { getLogger } from '@ask-starknet/shared';
import type { Command } from '../types';

const log = getLogger();

export async function loadCommands(client: any) {
  if (!client.commands) client.commands = new Collection<string, Command>();
  const commandsPath = path.join(__dirname, '..', 'commands');

  let files: string[] = [];
  try {
    files = await fs.readdir(commandsPath);
  } catch (err) {
    log.error({ err, commandsPath }, 'Failed to read commands directory');
    return;
  }

  const commandFiles = files.filter(
    (f) =>
      /\.(ts|js|mjs|cjs)$/.test(f) &&
      !f.endsWith('.d.ts') &&
      !f.endsWith('.map') &&
      !f.startsWith('_'),
  );

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const mod = await import(pathToFileURL(filePath).href);
      const candidate: Command | undefined =
        (mod && (mod.default || mod.command || mod[Object.keys(mod).find((k) => /Command$/i.test(k))!])) as Command | undefined;

      if (candidate && candidate.data && typeof candidate.execute === 'function') {
        const name = candidate.data.name ?? candidate.data?.toJSON?.().name;
        if (!name) {
          log.warn({ file }, 'Command missing name');
          continue;
        }
        client.commands.set(name, candidate);
        log.info({ name, file }, 'Loaded command');
      } else {
        log.warn({ file }, 'Invalid command module');
      }
    } catch (err) {
      log.error({ err, file }, 'Failed to load command');
    }
  }
}

export default loadCommands;


