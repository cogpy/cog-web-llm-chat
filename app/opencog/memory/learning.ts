/**
 * Agent Learning System
 * Enables agents to learn from experience and adapt behavior
 */

import { nanoid } from "nanoid";
import log from "loglevel";
import { PersistentMemory, MemoryEntry } from "./persistent";

/**
 * Learning experience record
 */
export interface LearningExperience {
  id: string;
  agentId: string;
  taskType: string;
  action: string;
  outcome: "success" | "failure" | "partial";
  reward: number; // -1 to 1
  context: Record<string, any>;
  timestamp: number;
}

/**
 * Learned strategy
 */
export interface Strategy {
  id: string;
  taskType: string;
  pattern: Record<string, any>; // Context pattern
  action: string;
  confidence: number; // 0-1
  successRate: number;
  useCount: number;
  lastUsed: number;
}

/**
 * Agent Learning Engine
 */
export class AgentLearning {
  private agentId: string;
  private memory: PersistentMemory;
  private experiences: LearningExperience[] = [];
  private strategies: Map<string, Strategy> = new Map();
  private learningRate: number = 0.1;
  private explorationRate: number = 0.2; // Epsilon for epsilon-greedy

  constructor(agentId: string, memory: PersistentMemory) {
    this.agentId = agentId;
    this.memory = memory;
  }

  /**
   * Record a learning experience
   */
  async recordExperience(
    taskType: string,
    action: string,
    outcome: "success" | "failure" | "partial",
    context: Record<string, any>,
  ): Promise<void> {
    const reward = outcome === "success" ? 1 : outcome === "partial" ? 0.5 : -1;

    const experience: LearningExperience = {
      id: nanoid(),
      agentId: this.agentId,
      taskType,
      action,
      outcome,
      reward,
      context,
      timestamp: Date.now(),
    };

    this.experiences.push(experience);

    // Store in persistent memory
    await this.memory.store({
      agentId: this.agentId,
      type: "experience",
      content: experience,
      timestamp: Date.now(),
      importance: Math.abs(reward), // High reward/penalty = high importance
      accessCount: 0,
      lastAccessed: Date.now(),
    });

    // Update strategies based on experience
    await this.updateStrategies(experience);

    log.debug(`Recorded experience for agent ${this.agentId}: ${outcome}`);
  }

  /**
   * Update strategies based on new experience
   */
  private async updateStrategies(
    experience: LearningExperience,
  ): Promise<void> {
    const strategyKey = `${experience.taskType}_${experience.action}`;
    let strategy = this.strategies.get(strategyKey);

    if (!strategy) {
      // Create new strategy
      strategy = {
        id: nanoid(),
        taskType: experience.taskType,
        pattern: experience.context,
        action: experience.action,
        confidence: 0.5,
        successRate: experience.outcome === "success" ? 1 : 0,
        useCount: 1,
        lastUsed: Date.now(),
      };
      this.strategies.set(strategyKey, strategy);
    } else {
      // Update existing strategy
      const success = experience.outcome === "success" ? 1 : 0;

      // Update success rate with exponential moving average
      strategy.successRate =
        (1 - this.learningRate) * strategy.successRate +
        this.learningRate * success;

      // Update confidence based on success rate and use count
      strategy.confidence = Math.min(
        0.95,
        strategy.successRate * Math.log(strategy.useCount + 1) * 0.2,
      );

      strategy.useCount++;
      strategy.lastUsed = Date.now();
    }

    // Store updated strategy in memory
    await this.memory.store({
      agentId: this.agentId,
      type: "skill",
      content: strategy,
      timestamp: Date.now(),
      importance: strategy.confidence,
      accessCount: strategy.useCount,
      lastAccessed: strategy.lastUsed,
    });
  }

  /**
   * Select best action for a given task type and context
   */
  async selectAction(
    taskType: string,
    context: Record<string, any>,
    availableActions: string[],
  ): Promise<string> {
    // Epsilon-greedy strategy
    if (Math.random() < this.explorationRate) {
      // Explore: random action
      return availableActions[
        Math.floor(Math.random() * availableActions.length)
      ];
    }

    // Exploit: choose best known strategy
    let bestAction = availableActions[0];
    let bestScore = -Infinity;

    for (const action of availableActions) {
      const strategyKey = `${taskType}_${action}`;
      const strategy = this.strategies.get(strategyKey);

      if (strategy) {
        // Score based on success rate, confidence, and context match
        const contextMatch = this.calculateContextMatch(
          strategy.pattern,
          context,
        );
        const score = strategy.successRate * strategy.confidence * contextMatch;

        if (score > bestScore) {
          bestScore = score;
          bestAction = action;
        }
      }
    }

    return bestAction;
  }

  /**
   * Calculate how well a context matches a pattern
   */
  private calculateContextMatch(
    pattern: Record<string, any>,
    context: Record<string, any>,
  ): number {
    const patternKeys = Object.keys(pattern);
    if (patternKeys.length === 0) return 1.0;

    let matches = 0;
    for (const key of patternKeys) {
      if (context[key] === pattern[key]) {
        matches++;
      }
    }

    return matches / patternKeys.length;
  }

  /**
   * Load strategies from memory
   */
  async loadStrategies(): Promise<void> {
    const memories = await this.memory.query({
      agentId: this.agentId,
      type: "skill",
    });

    for (const memory of memories) {
      const strategy = memory.content as Strategy;
      const strategyKey = `${strategy.taskType}_${strategy.action}`;
      this.strategies.set(strategyKey, strategy);
    }

    log.info(
      `Loaded ${this.strategies.size} strategies for agent ${this.agentId}`,
    );
  }

  /**
   * Get learning statistics
   */
  getStatistics(): {
    totalExperiences: number;
    totalStrategies: number;
    averageSuccessRate: number;
    explorationRate: number;
  } {
    const strategies = Array.from(this.strategies.values());
    const avgSuccessRate =
      strategies.length > 0
        ? strategies.reduce((sum, s) => sum + s.successRate, 0) /
          strategies.length
        : 0;

    return {
      totalExperiences: this.experiences.length,
      totalStrategies: strategies.length,
      averageSuccessRate: avgSuccessRate,
      explorationRate: this.explorationRate,
    };
  }

  /**
   * Adjust exploration rate (for epsilon-greedy)
   */
  setExplorationRate(rate: number): void {
    this.explorationRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Get top strategies
   */
  getTopStrategies(limit: number = 10): Strategy[] {
    return Array.from(this.strategies.values())
      .sort((a, b) => {
        const scoreA = a.successRate * a.confidence;
        const scoreB = b.successRate * b.confidence;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Reset learning
   */
  reset(): void {
    this.experiences = [];
    this.strategies.clear();
  }
}

/**
 * Adaptive Agent Behavior
 * Adjusts agent parameters based on performance
 */
export class AdaptiveBehavior {
  private performance: number[] = [];
  private windowSize: number = 50;

  /**
   * Record performance metric
   */
  recordPerformance(metric: number): void {
    this.performance.push(metric);

    // Keep only recent performance
    if (this.performance.length > this.windowSize) {
      this.performance.shift();
    }
  }

  /**
   * Get recent average performance
   */
  getAveragePerformance(): number {
    if (this.performance.length === 0) return 0;
    return (
      this.performance.reduce((sum, p) => sum + p, 0) / this.performance.length
    );
  }

  /**
   * Check if performance is improving
   */
  isImproving(): boolean {
    if (this.performance.length < 10) return true;

    const recentHalf = this.performance.slice(
      Math.floor(this.performance.length / 2),
    );
    const olderHalf = this.performance.slice(
      0,
      Math.floor(this.performance.length / 2),
    );

    const recentAvg =
      recentHalf.reduce((sum, p) => sum + p, 0) / recentHalf.length;
    const olderAvg =
      olderHalf.reduce((sum, p) => sum + p, 0) / olderHalf.length;

    return recentAvg > olderAvg;
  }

  /**
   * Suggest parameter adjustments
   */
  suggestAdjustments(): {
    increaseExploration?: boolean;
    decreaseExploration?: boolean;
    message: string;
  } {
    const avgPerformance = this.getAveragePerformance();
    const improving = this.isImproving();

    if (avgPerformance < 0.3 && !improving) {
      return {
        increaseExploration: true,
        message: "Low performance - suggest increasing exploration",
      };
    }

    if (avgPerformance > 0.7 && improving) {
      return {
        decreaseExploration: true,
        message: "Good performance - suggest decreasing exploration",
      };
    }

    return {
      message: "Performance stable - no adjustments needed",
    };
  }
}
