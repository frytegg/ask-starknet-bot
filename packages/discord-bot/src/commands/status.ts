/**
 * Status Command
 * 
 * Slash command: /status
 * 
 * This command should:
 * 1. Get queue metrics from the queue manager
 * 2. Display bot status (online, uptime, etc.)
 * 3. Show queue statistics (waiting, active, completed, failed)
 * 4. Format the response in an embed for better presentation
 * 
 * Example implementation:
 * ```typescript
 * import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
 * import { Command } from '../types';
 * 
 * export const statusCommand: Command = {
 *   data: new SlashCommandBuilder()
 *     .setName('status')
 *     .setDescription('Check bot status and queue metrics'),
 *   
 *   async execute(interaction) {
 *     const metrics = await queueManager.getMetrics();
 *     const embed = new EmbedBuilder()
 *       .setTitle('Bot Status')
 *       .addFields([
 *         { name: 'Status', value: 'Online', inline: true },
 *         { name: 'Queue Waiting', value: metrics.waiting.toString(), inline: true },
 *         // ... more fields
 *       ])
 *       .setColor('#00FF00');
 *     
 *     await interaction.reply({ embeds: [embed] });
 *   }
 * };
 * ```
 */

// TODO: Implement status command
/**
 * Status Command
 *
 * Slash command: /status
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import type { Command } from '../types';

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [
    d ? `${d}d` : null,
    h ? `${h}h` : null,
    m ? `${m}m` : null,
    `${sec}s`,
  ].filter(Boolean);
  return parts.join(' ');
}

export const statusCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check bot status and queue metrics'),

  async execute(interaction: ChatInputCommandInteraction) {
    const client: any = interaction.client as any;
    const queueManager = client.queueManager;

    // Defaults if metrics not available
    let metrics: any = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };

    try {
      if (queueManager?.getMetrics) {
        metrics = await queueManager.getMetrics();
      } else if (queueManager?.getStats) {
        metrics = await queueManager.getStats();
      }
    } catch (_) {
      // ignore metrics errors; show zeros
    }

    const now = Date.now();
    const readyTs = client.readyTimestamp ?? now;
    const uptime = fmtDuration(now - readyTs);

    const embed = new EmbedBuilder()
      .setTitle('Bot Status')
      .addFields(
        { name: 'Status', value: 'Online', inline: true },
        { name: 'Uptime', value: uptime, inline: true },
        { name: 'Ping', value: `${client.ws.ping}ms`, inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: 'Queue Waiting', value: String(metrics.waiting ?? 0), inline: true },
        { name: 'Queue Active', value: String(metrics.active ?? 0), inline: true },
        { name: 'Completed', value: String(metrics.completed ?? 0), inline: true },
        { name: 'Failed', value: String(metrics.failed ?? 0), inline: true },
      )
      .setColor('#00FF00')
      .setTimestamp(new Date());

    await interaction.reply({ embeds: [embed] });
  },
};

export default statusCommand;

