/**
 * Interaction Create Event Handler
 * 
 * Event: interactionCreate
 * 
 * This event fires when any interaction is created (commands, buttons, etc.).
 * 
 * Responsibilities:
 * 1. Check if interaction is a command
 * 2. Retrieve the command from client.commands
 * 3. Execute the command with error handling
 * 4. Log command usage
 * 5. Handle errors gracefully
 * 
 * Example implementation:
 * ```typescript
 * import { Events } from 'discord.js';
 * import { Event } from '../types';
 * 
 * export const interactionCreateEvent: Event = {
 *   name: Events.InteractionCreate,
 *   
 *   async execute(interaction) {
 *     if (!interaction.isChatInputCommand()) return;
 *     
 *     const command = interaction.client.commands.get(interaction.commandName);
 *     
 *     if (!command) {
 *       console.error(`Command ${interaction.commandName} not found`);
 *       return;
 *     }
 *     
 *     try {
 *       await command.execute(interaction);
 *     } catch (error) {
 *       console.error('Error executing command:', error);
 *       
 *       const errorMessage = 'There was an error executing this command!';
 *       
 *       if (interaction.replied || interaction.deferred) {
 *         await interaction.followUp({ content: errorMessage, ephemeral: true });
 *       } else {
 *         await interaction.reply({ content: errorMessage, ephemeral: true });
 *       }
 *     }
 *   }
 * };
 * ```
 */

// TODO: Implement interactionCreate event handler

/**
 * Interaction Create Event Handler
 */

import { Events, type Interaction } from 'discord.js';
import { getLogger } from '@ask-starknet/shared';
import type { Event } from '../types';

const log = getLogger();

export const interactionCreateEvent: Event = {
  name: Events.InteractionCreate,

  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const started = Date.now();
    const client: any = interaction.client as any;
    const commands = client.commands as Map<string, any> | undefined;
    const command = commands?.get(interaction.commandName);

    if (!command) {
      log.warn({ cmd: interaction.commandName }, 'Command not found');
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
      }
      return;
    }

    try {
      await command.execute(interaction);
      log.info(
        {
          cmd: interaction.commandName,
          user: interaction.user?.id,
          guild: interaction.guildId,
          channel: interaction.channelId,
          latencyMs: Date.now() - started,
        },
        'Command executed',
      );
    } catch (error: any) {
      log.error({ error, cmd: interaction.commandName }, 'Command error');
      const msg = 'There was an error executing this command.';
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, ephemeral: true });
      } else {
        await interaction.reply({ content: msg, ephemeral: true });
      }
    }
  },
};

export default interactionCreateEvent;

