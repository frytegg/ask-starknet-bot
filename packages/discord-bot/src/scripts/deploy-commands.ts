/**
 * Deploy Commands Script
 * 
 * This script should be used to register slash commands with Discord's API.
 * Run this separately from the main bot to update commands.
 * 
 * Responsibilities:
 * 1. Load all command files
 * 2. Extract command data (SlashCommandBuilder.toJSON())
 * 3. Register commands with Discord API using REST
 * 4. Support both guild-specific and global commands
 * 
 * Usage:
 * ```bash
 * node dist/scripts/deploy-commands.js
 * ```
 * 
 * Example implementation:
 * ```typescript
 * import { REST, Routes } from 'discord.js';
 * import * as fs from 'fs';
 * import * as path from 'path';
 * 
 * const commands = [];
 * const commandsPath = path.join(__dirname, '../commands');
 * const commandFiles = fs.readdirSync(commandsPath).filter(file =>
 *   file.endsWith('.js')
 * );
 * 
 * for (const file of commandFiles) {
 *   const command = require(path.join(commandsPath, file)).default;
 *   commands.push(command.data.toJSON());
 * }
 * 
 * const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
 * 
 * (async () => {
 *   try {
 *     console.log(`Registering ${commands.length} commands...`);
 *     
 *     await rest.put(
 *       Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
 *       { body: commands },
 *     );
 *     
 *     console.log('Successfully registered commands!');
 *   } catch (error) {
 *     console.error('Error registering commands:', error);
 *   }
 * })();
 * ```
 */

// TODO: Implement deploy-commands script
/**
 * Deploy Commands Script
 */

/**
 * Deploy Commands Script
 */

import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';

async function collectCommands(): Promise<any[]> {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const files = await fs.readdir(commandsPath);
  const list = files.filter((f) => /\.(js|mjs|cjs)$/.test(f) && !f.endsWith('.map'));

  const payloads: any[] = [];
  for (const file of list) {
    const mod = await import(path.join(commandsPath, file));
    const cmd = mod.default || mod.command || mod[Object.keys(mod).find((k) => /Command$/i.test(k))!];
    if (!cmd?.data?.toJSON) continue;
    payloads.push(cmd.data.toJSON());
  }
  return payloads;
}

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID; // optional

  if (!token || !clientId) {
    // eslint-disable-next-line no-console
    console.error('DISCORD_TOKEN and DISCORD_CLIENT_ID are required');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  const body = await collectCommands();
  // eslint-disable-next-line no-console
  console.log(`Registering ${body.length} command(s)`);

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
      // eslint-disable-next-line no-console
      console.log('Guild commands registered');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body });
      // eslint-disable-next-line no-console
      console.log('Global commands registered');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error registering commands', err);
    process.exit(1);
  }
}

main();

export {};
