import { Bot, Context, InlineKeyboard } from 'grammy';
import {
  BotQueueManager,
  initLogger,
  getLogger,
  Platform,
  JobData,
  BotConfigSchema,
} from '@ask-starknet/shared';
import { config as loadEnv } from 'dotenv';

// Load environment variables
loadEnv();

interface BotContext extends Context {
  logger: ReturnType<typeof getLogger>;
}

class TelegramBot {
  private bot: Bot<BotContext>;
  private queueManager: BotQueueManager;
  private logger = getLogger();
  private botUsername: string = '';

  constructor(token: string, queueManager: BotQueueManager) {
    this.bot = new Bot<BotContext>(token);
    this.queueManager = queueManager;
    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware() {
    // Add logger to context
    this.bot.use((ctx, next) => {
      ctx.logger = this.logger;
      return next();
    });

    // Log all incoming updates
    this.bot.use((ctx, next) => {
      const updateType = ctx.update.message
        ? 'message'
        : ctx.update.callback_query
        ? 'callback_query'
        : 'other';

      this.logger.info(
        {
          updateId: ctx.update.update_id,
          type: updateType,
          from: ctx.from?.id,
        },
        'Received update'
      );

      return next();
    });
  }

  private setupHandlers() {
    // Start command
    this.bot.command('start', async (ctx) => {
      const welcomeMessage = `
👋 Welcome to Ask Starknet Bot!

I'm here to answer your questions about what's happening in the Starknet ecosystem.

Just send me a message or mention me with your question, and I'll do my best to help!

Examples:
• What's happening on Twitter right now?
• Tell me about the latest Starknet updates
• What are people saying about Starknet?

Commands:
/start - Show this welcome message
/help - Get help
/status - Check bot status
      `.trim();

      await ctx.reply(welcomeMessage);
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      const helpMessage = `
🤖 Ask Starknet Bot Help

Simply ask me any question about Starknet and I'll try to answer!

You can:
• Send me a direct message
• Mention me in a group chat (@${this.botUsername})

Commands:
/start - Welcome message
/help - This help message
/status - Check if I'm working properly

Need more help? Contact the administrators.
      `.trim();

      await ctx.reply(helpMessage);
    });

    // Status command
    this.bot.command('status', async (ctx) => {
      try {
        const metrics = await this.queueManager.getMetrics();
        const statusMessage = `
🟢 Bot Status: Online

Queue Metrics:
• Waiting: ${metrics.waiting}
• Active: ${metrics.active}
• Completed: ${metrics.completed}
• Failed: ${metrics.failed}

Everything is working properly!
        `.trim();

        await ctx.reply(statusMessage);
      } catch (error) {
        await ctx.reply('⚠️ Error checking status. Please try again later.');
        this.logger.error({ error }, 'Error getting status');
      }
    });

    // Handle all text messages
    this.bot.on('message:text', async (ctx) => {
      const message = ctx.message.text;
      const userId = ctx.from.id.toString();
      const userName = ctx.from.username || ctx.from.first_name || 'Unknown';
      const messageId = ctx.message.message_id.toString();

      // In groups, only respond to mentions
      if (ctx.chat.type !== 'private') {
        const botMentioned =
          message.includes(`@${this.botUsername}`) ||
          ctx.message.reply_to_message?.from?.id === this.bot.botInfo.id;

        if (!botMentioned) {
          return; // Ignore messages that don't mention the bot
        }
      }

      this.logger.info(
        {
          userId,
          userName,
          chatType: ctx.chat.type,
          messageLength: message.length,
        },
        'Processing message'
      );

      // Send "typing" action
      await ctx.replyWithChatAction('typing');

      try {
        // Add job to queue
        const jobData: JobData = {
          platform: Platform.TELEGRAM,
          userId,
          userName,
          message,
          messageId,
          timestamp: Date.now(),
          metadata: {
            chatId: ctx.chat.id,
            chatType: ctx.chat.type,
          },
        };

        const job = await this.queueManager.addJob(jobData);

        // Send initial "processing" message
        const processingMsg = await ctx.reply('🤔 Processing your question...');

        // Wait for job completion with timeout
        const result = await this.queueManager.waitForJobCompletion(
          job.id!,
          60000 // 60 seconds timeout
        );

        if (result && result.success && result.response) {
          // Delete processing message
          await ctx.api.deleteMessage(ctx.chat.id, processingMsg.message_id);

          // Send the response
          await ctx.reply(result.response, {
            reply_parameters: { message_id: ctx.message.message_id },
          });

          this.logger.info(
            {
              userId,
              processingTime: result.processingTime,
            },
            'Response sent successfully'
          );
        } else if (result && !result.success) {
          // Error in processing
          await ctx.api.editMessageText(
            ctx.chat.id,
            processingMsg.message_id,
            '❌ Sorry, I encountered an error processing your request. Please try again later.'
          );

          this.logger.error(
            {
              userId,
              error: result.error,
            },
            'Error in job processing'
          );
        } else {
          // Timeout
          await ctx.api.editMessageText(
            ctx.chat.id,
            processingMsg.message_id,
            '⏱️ Your request is taking longer than expected. Please try again later.'
          );

          this.logger.warn({ userId, jobId: job.id }, 'Job timeout');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        await ctx.reply(
          '❌ Sorry, something went wrong. Please try again later.'
        );

        this.logger.error(
          {
            error: errorMessage,
            userId,
          },
          'Error handling message'
        );
      }
    });

    // Error handler
    this.bot.catch((err) => {
      this.logger.error(
        {
          error: err.error,
          ctx: err.ctx.update,
        },
        'Bot error'
      );
    });
  }

  async start() {
    try {
      // Get bot info
      const me = await this.bot.api.getMe();
      this.botUsername = me.username || '';

      this.logger.info(
        {
          username: this.botUsername,
          id: me.id,
        },
        'Bot info retrieved'
      );

      // Start bot
      this.logger.info('Starting Telegram bot...');
      await this.bot.start({
        onStart: () => {
          this.logger.info(
            { username: this.botUsername },
            'Telegram bot started successfully'
          );
        },
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to start bot');
      throw error;
    }
  }

  async stop() {
    this.logger.info('Stopping Telegram bot...');
    await this.bot.stop();
    this.logger.info('Telegram bot stopped');
  }
}

async function main() {
  // Initialize logger
  initLogger({
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.NODE_ENV !== 'production',
  });

  const logger = getLogger();

  logger.info('Starting Telegram bot service...');

  // Validate configuration
  const config = BotConfigSchema.parse({
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    mcpServer: {
      command: process.env.MCP_COMMAND || 'npx',
      args: process.env.MCP_ARGS?.split(',') || ['-y', '@modelcontextprotocol/server-everything'],
      env: process.env.MCP_ENV ? JSON.parse(process.env.MCP_ENV) : undefined,
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      pretty: process.env.NODE_ENV !== 'production',
    },
  });

  // Create queue manager
  const queueManager = new BotQueueManager(config);

  // Start worker
  await queueManager.startWorker(config);
  logger.info('Queue worker started');

  // Get Telegram token
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }

  // Create and start bot
  const bot = new TelegramBot(token, queueManager);

  // Handle shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    try {
      await bot.stop();
      await queueManager.close();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start the bot
  await bot.start();
}

// Run the bot
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { TelegramBot };

