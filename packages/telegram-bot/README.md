# Telegram Bot

Telegram bot for Ask Starknet that answers questions about the Starknet ecosystem.

## Features

- Responds to direct messages
- Responds to mentions in group chats
- Queue-based processing for scalability
- Real-time status updates
- Graceful error handling

## Commands

- `/start` - Welcome message
- `/help` - Help information
- `/status` - Check bot and queue status

## Usage

### Direct Messages
Simply send any question directly to the bot:
```
What's happening on Twitter right now?
```

### Group Chats
Mention the bot in your message:
```
@ask_starknet can you tell me about the latest Starknet updates?
```

## Configuration

The bot requires the following environment variables:

```bash
# Required
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

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

## Development

```bash
# Install dependencies
pnpm install

# Development mode with hot reload
pnpm dev

# Build
pnpm build

# Start production
pnpm start
```

## Getting a Telegram Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the token provided by BotFather
5. Set it as `TELEGRAM_BOT_TOKEN` environment variable

## Docker

Build and run with Docker:

```bash
docker build -t telegram-bot .
docker run -e TELEGRAM_BOT_TOKEN=your_token telegram-bot
```

## Architecture

The bot uses:
- **grammy**: Modern Telegram bot framework
- **Shared queue system**: For processing requests
- **LangGraph agent**: For generating responses via MCP

Request flow:
1. User sends message
2. Bot validates and adds to queue
3. Worker processes with LangGraph agent
4. Response sent back to user

