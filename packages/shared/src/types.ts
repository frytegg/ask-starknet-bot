import { z } from 'zod';

/**
 * Configuration schema for bots
 */
export const BotConfigSchema = z.object({
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
  }),
  mcpServer: z.object({
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    pretty: z.boolean().default(true),
  }).optional(),
});

export type BotConfig = z.infer<typeof BotConfigSchema>;

/**
 * Message types for the bots
 */
export enum Platform {
  TELEGRAM = 'telegram',
  TWITTER = 'twitter',
  DISCORD = 'discord',
}

/**
 * Schema for incoming bot requests
 */
export const BotRequestSchema = z.object({
  platform: z.nativeEnum(Platform),
  userId: z.string(),
  userName: z.string(),
  message: z.string(),
  messageId: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type BotRequest = z.infer<typeof BotRequestSchema>;

/**
 * Schema for bot responses
 */
export const BotResponseSchema = z.object({
  success: z.boolean(),
  response: z.string().optional(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type BotResponse = z.infer<typeof BotResponseSchema>;

/**
 * Job data for the queue
 */
export interface JobData extends BotRequest {
  timestamp: number;
  retryCount?: number;
}

/**
 * Job result from the queue
 */
export interface JobResult extends BotResponse {
  processingTime: number;
}

