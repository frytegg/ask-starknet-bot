# Twitter/X Bot

X/Twitter bot for Ask Starknet that monitors mentions and answers questions about the Starknet ecosystem.

## Features

- Monitors mentions of `@ask_starknet` (or your configured username)
- Automatically replies to mentions with AI-generated responses
- Supports long responses with automatic threading
- Rate limiting to comply with Twitter API limits
- Queue-based processing for scalability
- Duplicate detection to avoid processing the same tweet twice

## How It Works

1. Bot polls for mentions every minute (configurable)
2. When mentioned, extracts the question from the tweet
3. Processes the question through the queue system
4. Replies to the original tweet with the response
5. If response is too long, creates a thread

## Configuration

The bot requires the following environment variables:

```bash
# Required - Twitter API Credentials
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
TWITTER_BOT_USERNAME=ask_starknet

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# MCP Server configuration
MCP_COMMAND=npx
MCP_ARGS=-y,@your/mcp-server

# Optional
TWITTER_POLL_INTERVAL=60000  # Polling interval in ms (default: 60000 = 1 minute)
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

## Getting Twitter API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new App (or use existing one)
3. Go to "Keys and Tokens" tab
4. Generate/Copy:
   - API Key and Secret
   - Access Token and Secret
5. Make sure your app has **Read and Write** permissions
6. Set the credentials as environment variables

## Usage Examples

Users can mention your bot on Twitter:

```
@ask_starknet what's happening with Starknet right now?
```

```
@ask_starknet can you summarize the latest tweets about Cairo?
```

The bot will automatically reply with relevant information.

## Rate Limiting

The bot implements several rate limiting strategies:

- Polls for mentions every 60 seconds (configurable)
- Waits 5 seconds between processing different mentions
- Waits 2 seconds between tweets when creating threads
- Respects Twitter API rate limits

## Docker

Build and run with Docker:

```bash
docker build -t twitter-bot .
docker run -e TWITTER_API_KEY=... -e TWITTER_API_SECRET=... twitter-bot
```

## Architecture

The bot uses:
- **twitter-api-v2**: Twitter API v2 client
- **Polling mechanism**: Checks for new mentions periodically
- **Shared queue system**: For processing requests
- **LangGraph agent**: For generating responses via MCP

Request flow:
1. Poll for new mentions
2. Extract question from tweet
3. Add to queue for processing
4. Wait for response
5. Reply to tweet (with threading if needed)

## Troubleshooting

### Bot not responding
- Check API credentials are correct
- Verify app has Read and Write permissions
- Check logs for rate limiting errors

### Missing mentions
- Increase polling interval for more frequent checks
- Check Twitter API rate limits

### Threading issues
- Twitter has limits on thread length
- Bot automatically splits long responses

