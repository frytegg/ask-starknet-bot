import { StateGraph, END, START } from '@langchain/langgraph';
import { MCPClient } from '@langchain/mcp-adapters';
import { BotConfig } from './types';
import { getLogger } from './logger';

interface AgentState {
  messages: string[];
  response?: string;
  error?: string;
  context?: Record<string, unknown>;
}

interface ProcessContext {
  platform: string;
  userId: string;
  userName: string;
}

export class StarknetAgent {
  private mcpClient: MCPClient;
  private graph: ReturnType<typeof StateGraph<AgentState>>;
  private logger = getLogger();

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
    this.graph = this.buildGraph();
  }

  private buildGraph() {
    const workflow = new StateGraph<AgentState>({
      channels: {
        messages: {
          value: (prev: string[], next: string[]) => [...prev, ...next],
          default: () => [],
        },
        response: {
          value: (prev?: string, next?: string) => next ?? prev,
          default: () => undefined,
        },
        error: {
          value: (prev?: string, next?: string) => next ?? prev,
          default: () => undefined,
        },
        context: {
          value: (prev?: Record<string, unknown>, next?: Record<string, unknown>) =>
            next ? { ...prev, ...next } : prev,
          default: () => ({}),
        },
      },
    });

    // Node: Process user query
    workflow.addNode('process', async (state: AgentState) => {
      const userMessage = state.messages[state.messages.length - 1];
      
      this.logger.info({ message: userMessage }, 'Processing user query');

      try {
        // Use MCP tools to process the request
        const tools = await this.mcpClient.listTools();
        this.logger.debug({ toolCount: tools.length }, 'Available MCP tools');

        // For now, we'll call the MCP server with a simple prompt
        // You can customize this based on your MCP server's capabilities
        const response = await this.callMCPServer(userMessage);

        return {
          response,
          messages: [],
        };
      } catch (error) {
        this.logger.error({ error }, 'Error processing query');
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          messages: [],
        };
      }
    });

    // Node: Format response
    workflow.addNode('format', async (state: AgentState) => {
      if (state.error) {
        return {
          response: `I apologize, but I encountered an error: ${state.error}. Please try again later.`,
        };
      }

      return {
        response: state.response || 'I was unable to generate a response.',
      };
    });

    // Define the flow
    workflow.addEdge(START, 'process');
    workflow.addEdge('process', 'format');
    workflow.addEdge('format', END);

    return workflow.compile();
  }

  private async callMCPServer(message: string): Promise<string> {
    try {
      // List available tools
      const tools = await this.mcpClient.listTools();
      
      if (tools.length === 0) {
        this.logger.warn('No tools available from MCP server');
        return 'No tools available to process your request.';
      }

      // For demonstration, we'll use the first available tool
      // In a real implementation, you would select the appropriate tool based on the query
      const tool = tools[0];
      this.logger.info({ toolName: tool.name }, 'Using MCP tool');

      // Call the tool with the message
      const result = await this.mcpClient.callTool(tool.name, {
        query: message,
      });

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
      },
      'Processing request'
    );

    try {
      const result = await this.graph.invoke({
        messages: [message],
        context,
      });

      return result.response || 'No response generated';
    } catch (error) {
      this.logger.error({ error }, 'Error in agent processing');
      throw error;
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

    // Initialize MCP client
    const mcpClient = new MCPClient({
      command: config.mcpServer.command,
      args: config.mcpServer.args,
      env: config.mcpServer.env,
    });

    await mcpClient.connect();
    logger.info('MCP client connected');

    const agent = new StarknetAgent(mcpClient);
    logger.info('StarkNet agent initialized');

    return agent;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize agent');
    throw error;
  }
}

