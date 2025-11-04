/**
 * Base Agent Implementation
 * Autonomous agents that can communicate and collaborate
 */

import { nanoid } from "nanoid";
import log from "loglevel";
import {
  Agent,
  AgentStatus,
  AgentMessage,
  MessageType,
  Task,
  TaskStatus,
} from "./types";

export abstract class BaseAgent implements Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  capabilities: string[];
  context: Record<string, any>;
  private messageQueue: AgentMessage[] = [];
  private taskQueue: Task[] = [];

  constructor(name: string, role: string, capabilities: string[]) {
    this.id = nanoid();
    this.name = name;
    this.role = role;
    this.status = AgentStatus.IDLE;
    this.capabilities = capabilities;
    this.context = {};
  }

  /**
   * Process incoming message
   */
  async receiveMessage(message: AgentMessage): Promise<void> {
    log.info(`Agent ${this.name} received message:`, message);
    this.messageQueue.push(message);

    if (message.type === MessageType.TASK) {
      await this.handleTask(message);
    } else if (message.type === MessageType.QUERY) {
      await this.handleQuery(message);
    }
  }

  /**
   * Send message to another agent or broadcast
   */
  protected async sendMessage(
    content: string,
    receiverId?: string,
    type: MessageType = MessageType.RESPONSE,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const message: AgentMessage = {
      id: nanoid(),
      senderId: this.id,
      receiverId,
      content,
      timestamp: Date.now(),
      type,
      metadata,
    };

    // This will be handled by the orchestrator
    this.onSendMessage?.(message);
  }

  /**
   * Handle task assignment
   */
  private async handleTask(message: AgentMessage): Promise<void> {
    this.status = AgentStatus.BUSY;

    try {
      const result = await this.processTask(message.content, message.metadata);

      await this.sendMessage(result, message.senderId, MessageType.RESPONSE, {
        taskCompleted: true,
      });

      this.status = AgentStatus.IDLE;
    } catch (error) {
      log.error(`Agent ${this.name} task failed:`, error);
      this.status = AgentStatus.ERROR;

      await this.sendMessage(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        message.senderId,
        MessageType.RESPONSE,
        { taskFailed: true },
      );
    }
  }

  /**
   * Handle query
   */
  private async handleQuery(message: AgentMessage): Promise<void> {
    try {
      const response = await this.answerQuery(
        message.content,
        message.metadata,
      );

      await this.sendMessage(response, message.senderId, MessageType.RESPONSE);
    } catch (error) {
      log.error(`Agent ${this.name} query failed:`, error);
      await this.sendMessage(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        message.senderId,
        MessageType.RESPONSE,
      );
    }
  }

  /**
   * Abstract methods to be implemented by specific agents
   */
  protected abstract processTask(
    task: string,
    metadata?: Record<string, any>,
  ): Promise<string>;

  protected abstract answerQuery(
    query: string,
    metadata?: Record<string, any>,
  ): Promise<string>;

  /**
   * Callback for sending messages (set by orchestrator)
   */
  onSendMessage?: (message: AgentMessage) => void;

  /**
   * Check if agent can handle a capability
   */
  canHandle(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Update agent status
   */
  setStatus(status: AgentStatus): void {
    this.status = status;
  }

  /**
   * Get agent information
   */
  getInfo(): Agent {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      status: this.status,
      capabilities: this.capabilities,
      context: this.context,
    };
  }
}

/**
 * Translation Agent - specializes in language translation
 */
export class TranslationAgent extends BaseAgent {
  private translator: any;

  constructor(translator: any) {
    super("TranslationAgent", "translator", [
      "nl-to-atomese",
      "atomese-to-nl",
      "nl-to-metta",
      "metta-to-nl",
      "atomese-to-metta",
      "metta-to-atomese",
    ]);
    this.translator = translator;
  }

  protected async processTask(
    task: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const { sourceFormat, targetFormat } = metadata || {};

    if (!sourceFormat || !targetFormat) {
      throw new Error("Translation requires sourceFormat and targetFormat");
    }

    const result = await this.translator.translate({
      input: task,
      sourceFormat,
      targetFormat,
    });

    return result.output;
  }

  protected async answerQuery(
    query: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    return `I can translate between natural language, Atomese, and MeTTa. Available capabilities: ${this.capabilities.join(", ")}`;
  }
}

/**
 * Reasoning Agent - handles logical reasoning and inference
 */
export class ReasoningAgent extends BaseAgent {
  constructor() {
    super("ReasoningAgent", "reasoner", [
      "logical-inference",
      "pattern-matching",
      "deduction",
      "induction",
    ]);
  }

  protected async processTask(
    task: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    // Simulate reasoning process
    log.info(`Reasoning about: ${task}`);
    return `Reasoning result for: ${task}`;
  }

  protected async answerQuery(
    query: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    return `I can perform logical reasoning and inference. Query: ${query}`;
  }
}

/**
 * Knowledge Agent - manages knowledge base operations
 */
export class KnowledgeAgent extends BaseAgent {
  private cogServer: any;

  constructor(cogServer: any) {
    super("KnowledgeAgent", "knowledge-manager", [
      "query-atomspace",
      "add-knowledge",
      "update-knowledge",
      "search-knowledge",
    ]);
    this.cogServer = cogServer;
  }

  protected async processTask(
    task: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const { operation } = metadata || {};

    if (operation === "query" && this.cogServer) {
      const result = await this.cogServer.query(task);
      return JSON.stringify(result);
    }

    return `Knowledge operation: ${operation} on ${task}`;
  }

  protected async answerQuery(
    query: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    if (this.cogServer && this.cogServer.isConnected()) {
      const result = await this.cogServer.query(query);
      return JSON.stringify(result);
    }

    return `Knowledge base query: ${query}`;
  }
}

/**
 * Planning Agent - creates and manages plans
 */
export class PlanningAgent extends BaseAgent {
  constructor() {
    super("PlanningAgent", "planner", [
      "task-decomposition",
      "plan-creation",
      "goal-analysis",
      "dependency-resolution",
    ]);
  }

  protected async processTask(
    task: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    // Decompose task into subtasks
    const subtasks = this.decomposeTask(task);
    return JSON.stringify({
      originalTask: task,
      subtasks,
      estimatedSteps: subtasks.length,
    });
  }

  protected async answerQuery(
    query: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    return `Planning for: ${query}`;
  }

  private decomposeTask(task: string): string[] {
    // Simple task decomposition
    return [
      `Analyze requirements: ${task}`,
      `Identify resources needed`,
      `Execute main task`,
      `Validate results`,
    ];
  }
}
