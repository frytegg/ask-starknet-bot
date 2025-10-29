import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { JobData, JobResult, BotConfig } from './types';
import { getLogger } from './logger';
import { createAgent } from './agent';

export class BotQueueManager {
  private queue: Queue<JobData, JobResult>;
  private worker: Worker<JobData, JobResult> | null = null;
  private queueEvents: QueueEvents;
  private connection: Redis;
  private logger = getLogger();

  constructor(config: BotConfig) {
    this.connection = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue<JobData, JobResult>('bot-requests', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 100,
          age: 3600,
        },
        removeOnFail: {
          count: 50,
        },
      },
    });

    this.queueEvents = new QueueEvents('bot-requests', {
      connection: this.connection,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      const result = returnvalue as unknown as JobResult;
      this.logger.info({ jobId, processingTime: result.processingTime }, 'Job completed');
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.error({ jobId, failedReason }, 'Job failed');
    });
  }

  /**
   * Add a job to the queue
   */
  async addJob(data: JobData): Promise<Job<JobData, JobResult>> {
    this.logger.info(
      {
        platform: data.platform,
        userId: data.userId,
        messageId: data.messageId,
      },
      'Adding job to queue'
    );

    return this.queue.add('process-request', data, {
      jobId: `${data.platform}-${data.messageId}`,
    });
  }

  /**
   * Start the worker to process jobs
   */
  async startWorker(config: BotConfig): Promise<void> {
    if (this.worker) {
      this.logger.warn('Worker already started');
      return;
    }

    const agent = await createAgent(config);

    this.worker = new Worker<JobData, JobResult>(
      'bot-requests',
      async (job: Job<JobData, JobResult>) => {
        const startTime = Date.now();
        const { platform, userId, userName, message, messageId } = job.data;

        this.logger.info(
          {
            platform,
            userId,
            userName,
            messageId,
            attempt: job.attemptsMade + 1,
          },
          'Processing job'
        );

        try {
          // Process the request with the LangGraph agent
          const response = await agent.processRequest(message, {
            platform,
            userId,
            userName,
          });

          const processingTime = Date.now() - startTime;

          return {
            success: true,
            response,
            processingTime,
          };
        } catch (error) {
          const processingTime = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          this.logger.error(
            {
              error: errorMessage,
              platform,
              userId,
              messageId,
            },
            'Error processing job'
          );

          if (job.attemptsMade < (job.opts.attempts || 1) - 1) {
            throw error; // Will trigger retry
          }

          // Final attempt failed
          return {
            success: false,
            error: errorMessage,
            processingTime,
          };
        }
      },
      {
        connection: this.connection,
        concurrency: 5, // Process up to 5 jobs concurrently
      }
    );

    this.worker.on('completed', (job) => {
      this.logger.info({ jobId: job.id }, 'Worker: Job completed');
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error({ jobId: job?.id, error: err.message }, 'Worker: Job failed');
    });

    this.logger.info('Worker started');
  }

  /**
   * Stop the worker
   */
  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      this.logger.info('Worker stopped');
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<Job<JobData, JobResult> | undefined> {
    return this.queue.getJob(jobId);
  }

  /**
   * Wait for job completion
   */
  async waitForJobCompletion(
    jobId: string,
    timeout: number = 30000
  ): Promise<JobResult | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    try {
      const result = await job.waitUntilFinished(this.queueEvents, timeout);
      return result;
    } catch (error) {
      this.logger.error({ jobId, error }, 'Timeout waiting for job completion');
      return null;
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.stopWorker();
    await this.queue.close();
    await this.queueEvents.close();
    await this.connection.quit();
    this.logger.info('Queue manager closed');
  }

  /**
   * Get queue metrics
   */
  async getMetrics() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }
}

