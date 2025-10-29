import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { BotConfig } from './types';
import { getLogger } from './logger';

interface ProcessContext {
  platform: string;
  userId: string;
  userName: string;
}

export class StarknetAgent {
  private mcpClient: Client;
  private logger = getLogger();

  constructor(mcpClient: Client) {
    this.mcpClient = mcpClient;
  }

  private async callMCPServer(message: string): Promise<string> {
    try {
      // List available tools
      const toolsResponse = await this.mcpClient.listTools();
      const tools = toolsResponse.tools;
      
      if (tools.length === 0) {
        this.logger.warn('No tools available from MCP server');
        return 'I apologize, but I don\'t have any tools available to process your request at the moment. Please try again later.';
      }

      // For demonstration, we'll use the first available tool
      // In a real implementation, you would select the appropriate tool based on the query
      const tool = tools[0];
      this.logger.info({ toolName: tool.name }, 'Using MCP tool');

      // Call the tool with the message
      const result = await this.mcpClient.callTool({
        name: tool.name,
        arguments: {
          query: message,
        },
      });

      // Extract text from MCP result
      if (result.content && Array.isArray(result.content)) {
        const textContent = result.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');
        return textContent || 'I received a response but it was empty.';
      }

      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error) {
      this.logger.error({ error }, 'Error calling MCP server');
      throw error;
    }
  }

  async processRequest(message: string, context: ProcessContext): Promise<string> {
    this.logger.info(
      {
        platform: context.platform,
        userId: context.userId,
        userName: context.userName,
        message,
      },
      'Processing request'
    );

    try {
      // Simple direct processing without LangGraph
      const response = await this.callMCPServer(message);
      
      this.logger.info(
        {
          platform: context.platform,
          userId: context.userId,
          responseLength: response.length,
        },
        'Request processed successfully'
      );

      return response;
    } catch (error) {
      this.logger.error({ error, context }, 'Error in agent processing');
      return 'I apologize, but I encountered an error processing your request. Please try again later.';
    }
  }
}

/**
 * Create and initialize the StarkNet agent
 */
export async function createAgent(config: BotConfig): Promise<StarknetAgent> {
  const logger = getLogger();

  try {
    logger.info('Initializing MCP client');

    // Initialize MCP client with stdio transport
    const transport = new StdioClientTransport({
      command: config.mcpServer.command,
      args: config.mcpServer.args,
      env: config.mcpServer.env,
    });

    const mcpClient = new Client({
      name: 'ask-starknet-bot',
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    await mcpClient.connect(transport);
    logger.info('MCP client connected');

    const agent = new StarknetAgent(mcpClient);
    logger.info('StarkNet agent initialized');

    return agent;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize agent');
    throw error;
  }
}

