/**
 * Ask Command
 * 
 * Slash command: /ask <question>
 * 
 * This command should:
 * 1. Accept a question parameter
 * 2. Defer the reply (processing may take time)
 * 3. Add the question to the queue
 * 4. Wait for the response from the queue
 * 5. Edit the deferred reply with the answer
 * 6. Handle errors gracefully
 * 
 * Example implementation:
 * ```typescript
 * import { SlashCommandBuilder } from 'discord.js';
 * import { Command } from '../types';
 * 
 * export const askCommand: Command = {
 *   data: new SlashCommandBuilder()
 *     .setName('ask')
 *     .setDescription('Ask a question about Starknet')
 *     .addStringOption(option =>
 *       option
 *         .setName('question')
 *         .setDescription('Your question')
 *         .setRequired(true)
 *     ),
 *   
 *   async execute(interaction) {
 *     await interaction.deferReply();
 *     const question = interaction.options.getString('question');
 *     // Process with queue manager
 *     // Reply with response
 *   }
 * };
 * ```
 */

// TODO: Implement ask command
/**
 * Ask Command
 *
 * Slash command: /ask <question>
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { getLogger, Platform } from '@ask-starknet/shared';
import type { Command } from '../types';

const log = getLogger();

function pickAnswer(result: any): string {
  return (
    result?.answer ??
    result?.output ??
    result?.message ??
    result?.data ??
    'No answer received.'
  );
}

function toChunks(text: string, size = 3800): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

export const askCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask a question about Starknet')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('Your question')
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const client: any = interaction.client as any;
      const queueManager = client.queueManager;
      if (!queueManager) throw new Error('Queue manager unavailable');

      const question = interaction.options.get('question', true).value as string;
      await interaction.deferReply();

      const timeoutMs = Number(process.env.ASK_TIMEOUT_MS ?? 60000);

      const job = await queueManager.addJob({
        platform: Platform.DISCORD,
        userId: interaction.user.id,
        userName: interaction.user.username,
        message: question,
        messageId: interaction.id,
        timestamp: Date.now(),
      });

      const result = await queueManager.waitForJobCompletion(job.id!, timeoutMs);
      const answer = pickAnswer(result);

      const embed = new EmbedBuilder()
        .setTitle('Answer')
        .setDescription(answer.length <= 4096 ? answer : answer.slice(0, 4096))
        .setFooter({ text: `Latency ${Date.now() - interaction.createdTimestamp}ms` });

      if (answer.length <= 4096) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        // Send first chunk as embed, rest as follow-ups
        await interaction.editReply({ embeds: [embed] });
        const remaining = answer.slice(4096);
        for (const chunk of toChunks(remaining)) {
          await interaction.followUp({ content: chunk });
        }
      }
    } catch (err: any) {
      log.error({ err }, 'Ask command failed');
      const message =
        err?.message?.includes('timed out') || err?.name === 'TimeoutError'
          ? 'Request timed out. Try again.'
          : 'Error while processing the question.';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: message });
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    }
  },
};

export default askCommand;

