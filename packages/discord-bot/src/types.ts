import { Client, Collection } from 'discord.js';

/**
 * Extended Discord Client with custom properties
 * 
 * This interface extends the Discord.js Client to include:
 * - commands: Collection of bot commands
 * - queueManager: Reference to the shared queue manager
 * - Any other custom properties needed
 */
export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
  // TODO: Add queueManager property
}

/**
 * Command interface
 * 
 * Each command should implement this interface with:
 * - data: SlashCommandBuilder for Discord's API
 * - execute: Function to handle command execution
 */
export interface Command {
  data: any; // Should be SlashCommandBuilder
  execute: (interaction: any) => Promise<void>;
}

/**
 * Event interface
 * 
 * Each event handler should implement this interface with:
 * - name: Discord event name
 * - once: Whether the event should only run once
 * - execute: Function to handle the event
 */
export interface Event {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void>;
}

