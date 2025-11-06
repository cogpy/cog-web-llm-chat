/**
 * Multi-Agent Orchestrator
 * Manages agent lifecycle, task distribution, and communication
 */

import { nanoid } from "nanoid";
import log from "loglevel";
import {
  Agent,
  AgentMessage,
  AgentStatus,
  MessageType,
  Task,
  TaskStatus,
  OrchestrationState,
} from "./types";
import { BaseAgent } from "./agents";

export class AgentOrchestrator {
  private agents: Map<string, BaseAgent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private messageHistory: AgentMessage[] = [];
  private activeSession?: string;

  constructor() {
    log.info("Agent Orchestrator initialized");
  }

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);

    // Set up message callback
    agent.onSendMessage = (message: AgentMessage) => {
      this.routeMessage(message);
    };

    log.info(`Agent registered: ${agent.name} (${agent.id})`);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.setStatus(AgentStatus.OFFLINE);
      this.agents.delete(agentId);
      log.info(`Agent unregistered: ${agent.name}`);
    }
  }

  /**
   * Create and assign a task
   */
  async createTask(
    description: string,
    requiredCapability?: string,
    priority: number = 1,
  ): Promise<Task> {
    const task: Task = {
      id: nanoid(),
      description,
      status: TaskStatus.PENDING,
      priority,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.tasks.set(task.id, task);

    // Auto-assign if capability specified
    if (requiredCapability) {
      const agent = this.findAgentByCapability(requiredCapability);
      if (agent) {
        await this.assignTask(task.id, agent.id);
      }
    }

    return task;
  }

  /**
   * Assign a task to a specific agent
   */
  async assignTask(taskId: string, agentId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    const agent = this.agents.get(agentId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    task.assignedTo = agentId;
    task.status = TaskStatus.ASSIGNED;
    task.updatedAt = Date.now();

    // Send task to agent
    const message: AgentMessage = {
      id: nanoid(),
      senderId: "orchestrator",
      receiverId: agentId,
      content: task.description,
      timestamp: Date.now(),
      type: MessageType.TASK,
      metadata: { taskId: task.id },
    };

    await agent.receiveMessage(message);
    task.status = TaskStatus.IN_PROGRESS;
    task.updatedAt = Date.now();

    log.info(`Task ${taskId} assigned to agent ${agent.name}`);
  }

  /**
   * Route message between agents
   */
  private async routeMessage(message: AgentMessage): Promise<void> {
    this.messageHistory.push(message);

    if (message.receiverId) {
      // Direct message
      const recipient = this.agents.get(message.receiverId);
      if (recipient) {
        await recipient.receiveMessage(message);
      } else {
        log.warn(`Recipient not found: ${message.receiverId}`);
      }
    } else {
      // Broadcast message
      for (const agent of this.agents.values()) {
        if (agent.id !== message.senderId) {
          await agent.receiveMessage(message);
        }
      }
    }

    // Update task status if this is a task response
    if (message.metadata?.taskId) {
      const task = this.tasks.get(message.metadata.taskId);
      if (task && message.metadata.taskCompleted) {
        task.status = TaskStatus.COMPLETED;
        task.result = message.content;
        task.updatedAt = Date.now();
        log.info(`Task ${task.id} completed`);
      } else if (task && message.metadata.taskFailed) {
        task.status = TaskStatus.FAILED;
        task.updatedAt = Date.now();
        log.error(`Task ${task.id} failed: ${message.content}`);
      }
    }
  }

  /**
   * Find an available agent by capability
   */
  findAgentByCapability(capability: string): BaseAgent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.canHandle(capability) && agent.status === AgentStatus.IDLE) {
        return agent;
      }
    }

    // If no idle agent, return any agent with the capability
    for (const agent of this.agents.values()) {
      if (agent.canHandle(capability)) {
        return agent;
      }
    }

    return undefined;
  }

  /**
   * Get all agents with a specific capability
   */
  getAgentsByCapability(capability: string): BaseAgent[] {
    const result: BaseAgent[] = [];
    for (const agent of this.agents.values()) {
      if (agent.canHandle(capability)) {
        result.push(agent);
      }
    }
    return result;
  }

  /**
   * Send a message to an agent
   */
  async sendToAgent(
    agentId: string,
    content: string,
    type: MessageType = MessageType.QUERY,
  ): Promise<void> {
    const message: AgentMessage = {
      id: nanoid(),
      senderId: "user",
      receiverId: agentId,
      content,
      timestamp: Date.now(),
      type,
    };

    await this.routeMessage(message);
  }

  /**
   * Broadcast a message to all agents
   */
  async broadcast(content: string): Promise<void> {
    const message: AgentMessage = {
      id: nanoid(),
      senderId: "orchestrator",
      content,
      timestamp: Date.now(),
      type: MessageType.BROADCAST,
    };

    await this.routeMessage(message);
  }

  /**
   * Get orchestration state
   */
  getState(): OrchestrationState {
    return {
      agents: new Map(
        Array.from(this.agents.entries()).map(([id, agent]) => [
          id,
          agent.getInfo(),
        ]),
      ),
      tasks: new Map(this.tasks),
      messageQueue: this.messageHistory.slice(-100), // Keep last 100 messages
      activeSession: this.activeSession,
    };
  }

  /**
   * Get all agents
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values()).map((agent) => agent.getInfo());
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    const agent = this.agents.get(agentId);
    return agent ? agent.getInfo() : undefined;
  }

  /**
   * Get all tasks
   */
  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get message history
   */
  getMessageHistory(limit: number = 50): AgentMessage[] {
    return this.messageHistory.slice(-limit);
  }

  /**
   * Clear all completed tasks
   */
  clearCompletedTasks(): void {
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === TaskStatus.COMPLETED) {
        this.tasks.delete(id);
      }
    }
  }

  /**
   * Shutdown all agents
   */
  shutdown(): void {
    for (const agent of this.agents.values()) {
      agent.setStatus(AgentStatus.OFFLINE);
    }
    this.agents.clear();
    log.info("Orchestrator shutdown complete");
  }

  /**
   * Process natural language request with agent collaboration
   */
  async processRequest(
    request: string,
    context?: Record<string, any>,
  ): Promise<string> {
    log.info(`Processing request: ${request}`);

    // Create a task for the request
    const task = await this.createTask(request, undefined, 1);

    // Determine which agents should handle this
    const planningAgent = this.findAgentByCapability("task-decomposition");

    if (planningAgent) {
      // Get plan from planning agent
      await this.assignTask(task.id, planningAgent.id);

      // Wait for task completion by polling status
      const maxAttempts = 100;
      const pollInterval = 100;
      for (let i = 0; i < maxAttempts; i++) {
        const currentTask = this.tasks.get(task.id);
        if (currentTask?.status === TaskStatus.COMPLETED) {
          return currentTask.result || "Request processed successfully";
        }
        if (currentTask?.status === TaskStatus.FAILED) {
          throw new Error(
            `Task failed: ${currentTask.result || "Unknown error"}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      throw new Error("Task timeout - task did not complete in time");
    }

    return "Request processed (no planning agent available)";
  }
}
