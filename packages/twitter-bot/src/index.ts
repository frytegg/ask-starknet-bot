import { TwitterApi, TweetV2, ETwitterStreamEvent } from 'twitter-api-v2';
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

interface ProcessedTweet {
  id: string;
  timestamp: number;
}

class TwitterBot {
  private client: TwitterApi;
  private queueManager: BotQueueManager;
  private logger = getLogger();
  private botUsername: string;
  private processedTweets: Map<string, ProcessedTweet> = new Map();
  private maxProcessedTweets = 1000;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastMentionId: string | null = null;

  constructor(
    appKey: string,
    appSecret: string,
    accessToken: string,
    accessSecret: string,
    botUsername: string,
    queueManager: BotQueueManager
  ) {
    this.client = new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret,
    });
    this.botUsername = botUsername;
    this.queueManager = queueManager;
  }

  private cleanupProcessedTweets() {
    if (this.processedTweets.size > this.maxProcessedTweets) {
      const entries = Array.from(this.processedTweets.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, entries.length - this.maxProcessedTweets);
      toRemove.forEach(([id]) => this.processedTweets.delete(id));

      this.logger.debug(
        { removed: toRemove.length, remaining: this.processedTweets.size },
        'Cleaned up processed tweets'
      );
    }
  }

  private markTweetProcessed(tweetId: string) {
    this.processedTweets.set(tweetId, {
      id: tweetId,
      timestamp: Date.now(),
    });
    this.cleanupProcessedTweets();
  }

  private isTweetProcessed(tweetId: string): boolean {
    return this.processedTweets.has(tweetId);
  }

  private async splitLongTweet(text: string, maxLength: number = 280): Promise<string[]> {
    if (text.length <= maxLength) {
      return [text];
    }

    const tweets: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentTweet = '';

    for (const sentence of sentences) {
      if ((currentTweet + sentence).length <= maxLength - 10) {
        // -10 for thread indicator
        currentTweet += sentence;
      } else {
        if (currentTweet) {
          tweets.push(currentTweet.trim());
        }
        currentTweet = sentence;
      }
    }

    if (currentTweet) {
      tweets.push(currentTweet.trim());
    }

    // Add thread indicators
    if (tweets.length > 1) {
      return tweets.map((tweet, index) => `${index + 1}/${tweets.length}\n\n${tweet}`);
    }

    return tweets;
  }

  private async replyToTweet(
    tweetId: string,
    response: string,
    username: string
  ): Promise<void> {
    try {
      const tweets = await this.splitLongTweet(response);

      let replyToId = tweetId;

      for (let i = 0; i < tweets.length; i++) {
        const tweetText = tweets[i];

        // Mention the user in the first tweet
        const fullText = i === 0 ? `@${username} ${tweetText}` : tweetText;

        this.logger.info(
          {
            replyToId,
            tweetNumber: i + 1,
            totalTweets: tweets.length,
            length: fullText.length,
          },
          'Sending tweet'
        );

        const reply = await this.client.v2.tweet({
          text: fullText,
          reply: {
            in_reply_to_tweet_id: replyToId,
          },
        });

        replyToId = reply.data.id;

        // Rate limiting: wait between tweets
        if (i < tweets.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      this.logger.info(
        {
          originalTweetId: tweetId,
          repliesCount: tweets.length,
        },
        'Successfully replied to tweet'
      );
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          tweetId,
        },
        'Error replying to tweet'
      );
      throw error;
    }
  }

  private async processMention(tweet: TweetV2) {
    const tweetId = tweet.id;

    // Skip if already processed
    if (this.isTweetProcessed(tweetId)) {
      this.logger.debug({ tweetId }, 'Tweet already processed, skipping');
      return;
    }

    // Skip if it's our own tweet
    if (tweet.author_id === (await this.getCurrentUserId())) {
      this.logger.debug({ tweetId }, 'Skipping own tweet');
      this.markTweetProcessed(tweetId);
      return;
    }

    const text = tweet.text;
    const userId = tweet.author_id || 'unknown';
    const userName = text.match(/@(\w+)/)?.[1] || 'unknown';

    this.logger.info(
      {
        tweetId,
        userId,
        userName,
        textLength: text.length,
      },
      'Processing mention'
    );

    // Mark as processed immediately to avoid duplicates
    this.markTweetProcessed(tweetId);

    try {
      // Extract the actual question (remove mentions)
      const question = text
        .replace(/@\w+/g, '')
        .trim();

      if (!question) {
        this.logger.warn({ tweetId }, 'Empty question after removing mentions');
        await this.replyToTweet(
          tweetId,
          "Hi! I'm here to answer questions about Starknet. Please ask me something!",
          userName
        );
        return;
      }

      // Add job to queue
      const jobData: JobData = {
        platform: Platform.TWITTER,
        userId,
        userName,
        message: question,
        messageId: tweetId,
        timestamp: Date.now(),
        metadata: {
          originalTweet: tweet,
        },
      };

      const job = await this.queueManager.addJob(jobData);

      // Wait for job completion
      const result = await this.queueManager.waitForJobCompletion(
        job.id!,
        120000 // 2 minutes timeout for Twitter (longer because of rate limits)
      );

      if (result && result.success && result.response) {
        await this.replyToTweet(tweetId, result.response, userName);
        this.logger.info(
          {
            tweetId,
            processingTime: result.processingTime,
          },
          'Successfully processed and replied to mention'
        );
      } else if (result && !result.success) {
        await this.replyToTweet(
          tweetId,
          "I'm sorry, I encountered an error processing your request. Please try again later.",
          userName
        );
        this.logger.error(
          {
            tweetId,
            error: result.error,
          },
          'Error processing mention'
        );
      } else {
        await this.replyToTweet(
          tweetId,
          "Your request is taking longer than expected. I'll get back to you soon!",
          userName
        );
        this.logger.warn({ tweetId }, 'Mention processing timeout');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        {
          error: errorMessage,
          tweetId,
        },
        'Error handling mention'
      );

      try {
        await this.replyToTweet(
          tweetId,
          "Oops! Something went wrong. Please try again later.",
          userName
        );
      } catch (replyError) {
        this.logger.error(
          {
            error: replyError,
            tweetId,
          },
          'Failed to send error reply'
        );
      }
    }
  }

  private async getCurrentUserId(): Promise<string> {
    try {
      const me = await this.client.v2.me();
      return me.data.id;
    } catch (error) {
      this.logger.error({ error }, 'Failed to get current user ID');
      throw error;
    }
  }

  private async pollMentions() {
    try {
      const me = await this.client.v2.me();
      const userId = me.data.id;

      this.logger.debug('Polling for mentions...');

      // Get mentions
      const mentions = await this.client.v2.userMentionTimeline(userId, {
        max_results: 10,
        since_id: this.lastMentionId || undefined,
        'tweet.fields': ['author_id', 'created_at', 'conversation_id'],
      });

      if (mentions.data && mentions.data.data && mentions.data.data.length > 0) {
        this.logger.info(
          { count: mentions.data.data.length },
          'Found new mentions'
        );

        // Process mentions in order (oldest first)
        const tweets = [...mentions.data.data].reverse();

        for (const tweet of tweets) {
          await this.processMention(tweet);

          // Rate limiting: wait between processing
          await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds between mentions
        }

        // Update last mention ID
        this.lastMentionId = mentions.data.data[0].id;
      } else {
        this.logger.debug('No new mentions found');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ error: errorMessage }, 'Error polling mentions');
    }
  }

  async start() {
    try {
      // Verify credentials
      const me = await this.client.v2.me();
      this.logger.info(
        {
          id: me.data.id,
          username: me.data.username,
          name: me.data.name,
        },
        'Twitter bot authenticated'
      );

      // Start polling for mentions
      const pollInterval = parseInt(process.env.TWITTER_POLL_INTERVAL || '60000'); // Default 1 minute
      this.logger.info({ intervalMs: pollInterval }, 'Starting mention polling');

      this.pollingInterval = setInterval(() => {
        this.pollMentions();
      }, pollInterval);

      // Initial poll
      await this.pollMentions();

      this.logger.info('Twitter bot started successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to start Twitter bot');
      throw error;
    }
  }

  async stop() {
    this.logger.info('Stopping Twitter bot...');

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.logger.info('Twitter bot stopped');
  }
}

async function main() {
  // Initialize logger
  initLogger({
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.NODE_ENV !== 'production',
  });

  const logger = getLogger();

  logger.info('Starting Twitter bot service...');

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

  // Get Twitter credentials
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;
  const botUsername = process.env.TWITTER_BOT_USERNAME || 'ask_starknet';

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error(
      'Missing required Twitter credentials. Please set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_SECRET'
    );
  }

  // Create and start bot
  const bot = new TwitterBot(
    appKey,
    appSecret,
    accessToken,
    accessSecret,
    botUsername,
    queueManager
  );

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

  logger.info('Twitter bot is running');
}

// Run the bot
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { TwitterBot };

