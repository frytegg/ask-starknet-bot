# Ask Starknet Bot - Multi-Platform Monorepo

A monorepo containing bots for Telegram, X/Twitter, and Discord that answer questions about the Starknet ecosystem using LangGraph and MCP (Model Context Protocol).

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Bot Platforms                            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Telegram │    │ Twitter  │    │ Discord  │              │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘              │
│       │               │               │                      │
│       └───────────────┼───────────────┘                      │
│                       │                                      │
│                       ▼                                      │
│              ┌────────────────┐                             │
│              │  Queue Manager │                             │
│              │   (BullMQ)     │                             │
│              └────────┬───────┘                             │
│                       │                                      │
│                       ▼                                      │
│              ┌────────────────┐                             │
│              │ LangGraph Agent│                             │
│              │  + MCP Adapter │                             │
│              └────────────────┘                             │
│                                                              │
│                       ▼                                      │
│              ┌────────────────┐                             │
│              │   MCP Server   │                             │
│              │  (Your Tools)  │                             │
│              └────────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Monorepo Structure

```
ask-starknet-bot/
├── packages/
│   ├── shared/              # Shared agent, queue, and utilities
│   │   ├── src/
│   │   │   ├── agent.ts     # LangGraph agent with MCP
│   │   │   ├── queue.ts     # BullMQ queue manager
│   │   │   ├── types.ts     # Shared types
│   │   │   └── logger.ts    # Logging utilities
│   │   └── package.json
│   │
│   ├── telegram-bot/        # Telegram bot (Complete)
│   │   ├── src/
│   │   │   └── index.ts     # Bot implementation
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── twitter-bot/         # X/Twitter bot (Complete)
│   │   ├── src/
│   │   │   └── index.ts     # Bot implementation
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── discord-bot/         # Discord bot (Architecture only)
│       ├── src/
│       │   ├── commands/    # Slash commands (TODO)
│       │   ├── events/      # Event handlers (TODO)
│       │   └── utils/       # Utilities (TODO)
│       ├── Dockerfile
│       └── package.json
│
├── docker-compose.yml       # Orchestration for all services
├── pnpm-workspace.yaml      # pnpm workspace configuration
├── package.json             # Root package with shared scripts
├── tsconfig.json            # Shared TypeScript configuration
├── env.example              # Environment variables template
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose (for deployment)
- Redis (if running without Docker)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd ask-starknet-bot
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure environment variables**
```bash
cp env.example .env
# Edit .env with your credentials
```

4. **Build all packages**
```bash
pnpm build
```

### Development

Run all bots in development mode:
```bash
pnpm dev
```

Run individual bots:
```bash
pnpm telegram:dev
pnpm twitter:dev
pnpm discord:dev
```

### Production Deployment with Docker

1. **Configure environment**
```bash
cp env.example .env
# Edit .env with production credentials
```

2. **Deploy all services**
```bash
docker-compose up -d
```

3. **Deploy specific services**
```bash
# Only Telegram and Redis
docker-compose up -d redis telegram-bot

# Only Twitter and Redis
docker-compose up -d redis twitter-bot
```

4. **View logs**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f telegram-bot
```

5. **Stop services**
```bash
docker-compose down
```

## 🤖 Bot Configuration

### Telegram Bot

Get your bot token from [@BotFather](https://t.me/botfather):

1. Send `/newbot` to BotFather
2. Follow instructions to create your bot
3. Copy the token to `TELEGRAM_BOT_TOKEN` in `.env`

**Features:**
- Responds to direct messages
- Responds to mentions in groups
- `/start`, `/help`, `/status` commands
- Queue-based processing

**Usage:**
- Direct message: Just send a question
- In groups: Mention the bot `@your_bot_name what is Starknet?`

[More details](./packages/telegram-bot/README.md)

### Twitter/X Bot

Get your credentials from [Twitter Developer Portal](https://developer.twitter.com/):

1. Create an App with Read and Write permissions
2. Generate API Key, API Secret, Access Token, and Access Secret
3. Add credentials to `.env`

**Features:**
- Monitors mentions of your username (e.g., `@ask_starknet`)
- Automatic replies with threading for long responses
- Rate limiting and duplicate detection
- Configurable polling interval

**Usage:**
Users mention your bot: `@ask_starknet what's happening with Starknet?`

[More details](./packages/twitter-bot/README.md)

### Discord Bot

Get your bot token from [Discord Developer Portal](https://discord.com/developers/applications):

1. Create a new Application
2. Create a bot and copy the token
3. Enable Message Content Intent
4. Add token to `.env`

**Features (Architecture Provided):**
- Slash commands: `/ask`, `/status`, `/help`
- Optional mention support
- Embed-based responses
- Queue integration

**Status:** Architecture and structure provided. Implementation TODO.

[More details](./packages/discord-bot/README.md)

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `env.example`:

```bash
# Required for each bot you want to run
TELEGRAM_BOT_TOKEN=your_token
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_SECRET=your_secret
DISCORD_TOKEN=your_token
DISCORD_CLIENT_ID=your_id

# Redis (for queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# MCP Server Configuration
MCP_COMMAND=npx
MCP_ARGS=-y,@your/mcp-server
```

### MCP Server Configuration

The bots use a centralized LangGraph agent that connects to an MCP (Model Context Protocol) server. Configure your MCP server:

```bash
# Example: Using a built-in MCP server
MCP_COMMAND=npx
MCP_ARGS=-y,@modelcontextprotocol/server-everything

# Example: Using a custom MCP server
MCP_COMMAND=node
MCP_ARGS=./your-mcp-server.js

# With environment variables
MCP_ENV={"API_KEY":"your_key","ENV":"production"}
```

The agent uses `@langchain/mcp-adapters` to communicate with the MCP server.

## 📚 Package Details

### @ask-starknet/shared

Core package with:
- **LangGraph Agent**: Processes queries using MCP integration
- **Queue Manager**: BullMQ-based queue for concurrent request handling
- **Types**: Shared TypeScript types and Zod schemas
- **Logger**: Structured logging with Pino

[Documentation](./packages/shared/README.md)

## 🛠️ Development Scripts

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build shared package only
pnpm shared:build

# Run all bots in development
pnpm dev

# Run individual bots
pnpm telegram:dev
pnpm twitter:dev
pnpm discord:dev

# Type checking
pnpm type-check

# Clean build artifacts
pnpm clean
```

## 🐳 Docker Deployment

The monorepo includes a complete Docker Compose setup:

**Services:**
- `redis`: Queue backend
- `telegram-bot`: Telegram bot
- `twitter-bot`: Twitter/X bot
- `discord-bot`: Discord bot

**Features:**
- Multi-stage builds for optimized images
- Health checks for Redis
- Automatic restarts
- Log rotation
- Shared network
- Persistent Redis data

**Deployment:**
```bash
# Full stack
docker-compose up -d

# Scale services (if needed)
docker-compose up -d --scale telegram-bot=2

# Update and rebuild
docker-compose up -d --build

# Monitor
docker-compose logs -f

# Stop
docker-compose down
```

## 🔍 Queue System

All bots use a centralized queue system (BullMQ + Redis) for:

- **Concurrent Processing**: Handle multiple requests simultaneously
- **Rate Limiting**: Control processing speed
- **Retry Logic**: Automatic retries with exponential backoff
- **Job Tracking**: Monitor job status and metrics
- **Error Handling**: Graceful error recovery

**Queue Metrics:**

Each bot provides status information:
- Telegram: `/status` command
- Twitter: Check logs
- Discord: `/status` command (when implemented)

## 📊 Monitoring & Logs

### Docker Logs
```bash
# View all logs
docker-compose logs -f

# Specific service
docker-compose logs -f telegram-bot

# Last 100 lines
docker-compose logs --tail=100 telegram-bot
```

### Log Levels
Set via `LOG_LEVEL` environment variable:
- `debug`: Detailed debugging information
- `info`: General information (default)
- `warn`: Warning messages
- `error`: Error messages only

### Production Logging
In production (`NODE_ENV=production`), logs are in JSON format for easier parsing and aggregation.

## 🚨 Troubleshooting

### Bots not starting
- Check environment variables are set correctly
- Verify Redis is running: `docker-compose ps`
- Check logs: `docker-compose logs -f <service-name>`

### Queue not processing
- Verify Redis connection
- Check worker is started (logs should show "Worker started")
- Check queue metrics

### MCP connection issues
- Verify MCP_COMMAND and MCP_ARGS are correct
- Check if MCP server is accessible
- Review agent logs for connection errors

### Rate limiting (Twitter)
- Reduce TWITTER_POLL_INTERVAL
- Monitor Twitter API rate limits
- Check for duplicate processing

## 📈 Scaling

### Horizontal Scaling
Run multiple instances of the same bot:
```bash
docker-compose up -d --scale telegram-bot=3
```

### Queue Concurrency
Adjust in `packages/shared/src/queue.ts`:
```typescript
concurrency: 5, // Process up to 5 jobs concurrently
```

### Redis Performance
For high load, consider:
- Separate Redis instance
- Redis Cluster
- Increased memory limits

## 🔐 Security

- Never commit `.env` files
- Use environment-specific credentials
- Rotate API keys regularly
- Use Redis password in production
- Implement rate limiting per user
- Sanitize user inputs
- Review MCP server security

## 🤝 Contributing

1. Follow existing code structure
2. Use TypeScript strict mode
3. Write meaningful commit messages
4. Test before committing
5. Update documentation

## 📝 License

MIT

## 🔗 Useful Links

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Twitter API v2](https://developer.twitter.com/en/docs/twitter-api)
- [Discord.js Guide](https://discordjs.guide/)
- [LangGraph Documentation](https://js.langchain.com/docs/langgraph)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [BullMQ Documentation](https://docs.bullmq.io/)

## 💡 Tips

1. **Start Small**: Deploy one bot at a time
2. **Monitor Logs**: Keep an eye on logs during initial deployment
3. **Test MCP**: Verify your MCP server works before deploying
4. **Set Limits**: Configure appropriate rate limits and timeouts
5. **Backup Data**: Regularly backup Redis data if needed
6. **Health Checks**: Monitor bot health and queue metrics

## 🆘 Support

For issues and questions:
1. Check bot-specific READMEs
2. Review logs for error messages
3. Verify configuration
4. Check API credentials and permissions

---

Built with ❤️ for the Starknet community

