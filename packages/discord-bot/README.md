# Discord Bot

Discord bot for Ask Starknet that answers questions about the Starknet ecosystem.

## Architecture Overview

This package contains the **architecture and structure** for the Discord bot. The implementation is left for you to complete based on your specific needs.

## Project Structure

```
discord-bot/
├── src/
│   ├── index.ts                    # Main entry point (TODO)
│   ├── types.ts                    # TypeScript interfaces and types
│   ├── commands/                   # Slash commands
│   │   ├── ask.ts                  # /ask command (TODO)
│   │   ├── status.ts               # /status command (TODO)
│   │   └── help.ts                 # /help command (TODO)
│   ├── events/                     # Event handlers
│   │   ├── ready.ts                # Bot ready event (TODO)
│   │   ├── interactionCreate.ts   # Interaction handling (TODO)
│   │   └── messageCreate.ts       # Optional message handling (TODO)
│   ├── utils/                      # Utilities
│   │   ├── commandLoader.ts       # Load commands (TODO)
│   │   └── eventLoader.ts         # Load events (TODO)
│   └── scripts/
│       └── deploy-commands.ts     # Deploy slash commands (TODO)
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

## Features to Implement

### Commands

1. **`/ask <question>`** - Main command for asking questions
   - Accepts a question parameter
   - Defers reply while processing
   - Uses queue system from shared package
   - Returns AI-generated response

2. **`/status`** - Check bot and queue status
   - Shows bot uptime
   - Displays queue metrics
   - Uses embeds for formatting

3. **`/help`** - Display help information
   - Lists all commands
   - Provides usage examples
   - Shows bot information

### Event Handlers

1. **ready** - Fires when bot is ready
   - Logs successful connection
   - Sets bot presence/status
   - Optionally registers commands

2. **interactionCreate** - Handles all interactions
   - Routes to appropriate command
   - Error handling
   - Logging

3. **messageCreate** (Optional) - Handles mentions
   - Alternative to slash commands
   - Processes bot mentions as questions

## Configuration

The bot will require the following environment variables:

```bash
# Required
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# MCP Server configuration
MCP_COMMAND=npx
MCP_ARGS=-y,@your/mcp-server

# Optional
LOG_LEVEL=info
NODE_ENV=development
```

## Development Workflow

1. **Implement the main entry point** (`src/index.ts`)
   - Initialize Discord client with proper intents
   - Load commands and events
   - Connect to queue manager
   - Handle graceful shutdown

2. **Implement commands** (`src/commands/*.ts`)
   - Follow the Command interface from `types.ts`
   - Use SlashCommandBuilder from discord.js
   - Integrate with shared queue system

3. **Implement event handlers** (`src/events/*.ts`)
   - Follow the Event interface from `types.ts`
   - Handle Discord events appropriately

4. **Implement utilities** (`src/utils/*.ts`)
   - Command and event loaders
   - Helper functions

5. **Deploy commands**
   - Run the deploy-commands script
   - This registers your slash commands with Discord

## Getting a Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new Application
3. Go to "Bot" tab and create a bot
4. Copy the token (this is your `DISCORD_TOKEN`)
5. Enable these Privileged Gateway Intents:
   - Message Content Intent (if using message commands)
   - Server Members Intent (optional)
6. Go to OAuth2 > URL Generator
7. Select scopes: `bot` and `applications.commands`
8. Select bot permissions: 
   - Read Messages/View Channels
   - Send Messages
   - Embed Links
   - Read Message History
9. Use the generated URL to invite the bot to your server

## Required Discord.js Intents

```typescript
import { GatewayIntentBits } from 'discord.js';

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent, // Required for message content
];
```

## Usage Examples

Once implemented, users will be able to:

**Slash Commands:**
```
/ask What is Starknet?
/status
/help
```

**Mentions (if implemented):**
```
@AskStarknet what's happening with Cairo?
```

## Development

```bash
# Install dependencies
pnpm install

# Development mode with hot reload
pnpm dev

# Build
pnpm build

# Deploy commands
node dist/scripts/deploy-commands.js

# Start production
pnpm start
```

## Integration with Shared Package

The Discord bot should use the shared package for:

```typescript
import {
  BotQueueManager,
  initLogger,
  getLogger,
  Platform,
  JobData,
  BotConfigSchema,
} from '@ask-starknet/shared';

// Initialize queue manager
const queueManager = new BotQueueManager(config);
await queueManager.startWorker(config);

// Add job to queue
const job = await queueManager.addJob({
  platform: Platform.DISCORD,
  userId: interaction.user.id,
  userName: interaction.user.username,
  message: question,
  messageId: interaction.id,
  timestamp: Date.now(),
});

// Wait for response
const result = await queueManager.waitForJobCompletion(job.id!, 60000);
```

## Docker

Build and run with Docker:

```bash
docker build -t discord-bot .
docker run -e DISCORD_TOKEN=your_token discord-bot
```

## Notes

- All files in `src/` contain detailed comments and examples
- The architecture is designed to be scalable and maintainable
- Follow Discord.js best practices
- Implement proper error handling
- Use embeds for rich message formatting
- Consider rate limiting for user commands

