/**
 * Message Create Event Handler (Optional)
 * 
 * Event: messageCreate
 * 
 * This event fires when a message is sent in a channel the bot has access to.
 * 
 * Use this if you want to support traditional text commands or bot mentions
 * in addition to slash commands.
 * 
 * Responsibilities:
 * 1. Ignore messages from bots
 * 2. Check if bot is mentioned
 * 3. Process the message as a question
 * 4. Add to queue and respond
 * 
 * Example implementation:
 * ```typescript
 * import { Events } from 'discord.js';
 * import { Event } from '../types';
 * 
 * export const messageCreateEvent: Event = {
 *   name: Events.MessageCreate,
 *   
 *   async execute(message) {
 *     // Ignore bot messages
 *     if (message.author.bot) return;
 *     
 *     // Check if bot is mentioned
 *     if (!message.mentions.has(message.client.user)) return;
 *     
 *     // Extract question (remove mention)
 *     const question = message.content
 *       .replace(`<@${message.client.user.id}>`, '')
 *       .trim();
 *     
 *     if (!question) {
 *       await message.reply('Please ask me a question!');
 *       return;
 *     }
 *     
 *     // Process with queue manager
 *     await message.channel.sendTyping();
 *     // ... process and reply
 *   }
 * };
 * ```
 */

// TODO: Implement messageCreate event handler (optional)
/**
 * Message Create Event Handler (Optional)
 */

import { Events, type Message, EmbedBuilder, type TextBasedChannel } from 'discord.js';
import { getLogger, Platform } from '@ask-starknet/shared';
import type { Event } from '../types';

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

function toChunks(text: string, size = 1900): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

export const messageCreateEvent: Event = {
  name: Events.MessageCreate,

  async execute(message: Message) {
    try {
      // 1) Ignore other bots
      if (message.author.bot) return;

      const client: any = message.client as any;
      const me = client.user;
      if (!me) return;

      // 2) Require a direct mention of the bot
      if (!message.mentions.users.has(me.id)) return;

      // 3) Extract question by stripping the mention tokens
      const mentionRegex = new RegExp(`<@!?${me.id}>`, 'g');
      const question = message.content.replace(mentionRegex, '').trim();

      if (!question) {
        await message.reply('Provide a question after mentioning me.');
        return;
      }

      const queueManager = client.queueManager;
      if (!queueManager) {
        await message.reply('Queue is unavailable. Use /ask instead.');
        return;
      }

      // 4) Add to queue and respond
      const channel = message.channel as TextBasedChannel | any;
      if (typeof (channel as any).send !== 'function') {
      await message.reply('I can only respond in text channels.');
      return;
      }

      await channel.sendTyping();
      const typer = setInterval(() => {
      void channel.sendTyping().catch(() => {});
      }, 8000);

      try {
        const timeoutMs = Number(process.env.ASK_TIMEOUT_MS ?? 60000);
        const job = await queueManager.addJob({
          platform: Platform.DISCORD,
          userId: message.author.id,
          userName: message.author.username,
          message: question,
          messageId: message.id,
          timestamp: Date.now(),
        });

        const result = await queueManager.waitForJobCompletion(job.id!, timeoutMs);
        const answer = pickAnswer(result);

        const embed = new EmbedBuilder()
          .setTitle('Answer')
          .setDescription(answer.slice(0, 4096))
          .setFooter({ text: `Asked by @${message.author.username}` });

        await message.reply({ embeds: [embed] });

        if (answer.length > 4096) {
          const remaining = answer.slice(4096);
          for (const chunk of toChunks(remaining)) {
            await channel.send({ content: chunk });
          }
        }
      } finally {
        clearInterval(typer);
      }
    } catch (error: any) {
      log.error({ error }, 'messageCreate handler failed');
      try {
        await message.reply('Error processing your question. Try /ask.');
      } catch {}
    }
  },
};

export default messageCreateEvent;


