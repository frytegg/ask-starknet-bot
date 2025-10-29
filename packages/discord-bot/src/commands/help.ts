/**
 * Help Command
 * 
 * Slash command: /help
 * 
 * This command should:
 * 1. Display information about the bot
 * 2. List available commands
 * 3. Provide usage examples
 * 4. Show how to get support
 * 
 * Example implementation:
 * ```typescript
 * import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
 * import { Command } from '../types';
 * 
 * export const helpCommand: Command = {
 *   data: new SlashCommandBuilder()
 *     .setName('help')
 *     .setDescription('Get help with the bot'),
 *   
 *   async execute(interaction) {
 *     const embed = new EmbedBuilder()
 *       .setTitle('Ask Starknet Bot - Help')
 *       .setDescription('I\'m here to answer questions about Starknet!')
 *       .addFields([
 *         {
 *           name: 'Commands',
 *           value: '/ask - Ask a question\n/status - Check status\n/help - This message'
 *         },
 *         {
 *           name: 'Examples',
 *           value: '/ask What is Starknet?\n/ask Tell me about Cairo'
 *         }
 *       ])
 *       .setColor('#5865F2');
 *     
 *     await interaction.reply({ embeds: [embed] });
 *   }
 * };
 * ```
 */

// TODO: Implement help command
/**
 * Help Command
 *
 * Slash command: /help
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import type { Command } from '../types';

export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with the bot'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('Ask Starknet Bot - Help')
      .setDescription('Answers questions about the Starknet ecosystem.')
      .addFields(
        {
          name: 'Commands',
          value: [
            '`/ask <question>` - ask a question',
            '`/status` - check bot and queue status',
            '`/help` - this help message',
          ].join('\n'),
        },
        {
          name: 'Examples',
          value: [
            '`/ask What is Starknet?`',
            '`/ask Tell me about Cairo`',
          ].join('\n'),
        },
        {
          name: 'Support',
          value: 'Use `/status` for uptime and queue. Contact server moderators if issues persist.',
        },
      )
      .setColor('#5865F2');

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default helpCommand;


