# @ask-starknet/shared

Shared package containing the LangGraph agent, MCP adapter integration, and queue management system for all bots.

## Features

- **LangGraph Agent**: Processes user queries using MCP server integration
- **Queue System**: BullMQ-based queue for handling concurrent requests
- **Type Safety**: Full TypeScript support with Zod validation
- **Logging**: Structured logging with Pino

## Architecture

### Agent (`agent.ts`)
- Integrates with MCP server using `@langchain/mcp-adapters`
- Uses LangGraph for orchestrating the request processing workflow
- Handles tool selection and execution via MCP

### Queue Manager (`queue.ts`)
- Manages request queuing with BullMQ and Redis
- Supports concurrent processing (configurable concurrency)
- Automatic retry logic with exponential backoff
- Job completion tracking and metrics

### Types (`types.ts`)
- Platform enum (Telegram, Twitter, Discord)
- Request/Response schemas with Zod validation
- Job data structures

## Usage

```typescript
import { BotQueueManager, createAgent, initLogger } from '@ask-starknet/shared';

// Initialize logger
initLogger({ level: 'info', pretty: true });

// Create queue manager
const queueManager = new BotQueueManager({
  redis: {
    host: 'localhost',
    port: 6379,
  },
  mcpServer: {
    command: 'npx',
    args: ['-y', '@your/mcp-server'],
  },
});

// Start worker
await queueManager.startWorker(config);

// Add job
await queueManager.addJob({
  platform: Platform.TELEGRAM,
  userId: '123',
  userName: 'user',
  message: 'What is happening on Twitter?',
  messageId: 'msg-123',
  timestamp: Date.now(),
});
```

## Configuration

The package expects a configuration object with:

```typescript
{
  redis: {
    host: string;
    port: number;
    password?: string;
  },
  mcpServer: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  },
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    pretty: boolean;
  }
}
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm type-check
```

