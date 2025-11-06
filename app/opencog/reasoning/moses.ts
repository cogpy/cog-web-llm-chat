/**
 * MOSES (Meta-Optimizing Semantic Evolutionary Search) Implementation
 * Evolves program trees to solve optimization problems
 */

import { nanoid } from "nanoid";
import log from "loglevel";

/**
 * A program tree node
 */
export interface ProgramNode {
  type: "function" | "terminal" | "variable";
  value: string | number;
  children?: ProgramNode[];
}

/**
 * A candidate program with fitness score
 */
export interface Candidate {
  id: string;
  program: ProgramNode;
  fitness: number;
  generation: number;
}

/**
 * MOSES Evolution Parameters
 */
export interface MOSESConfig {
  populationSize: number;
  maxGenerations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismCount: number;
  tournamentSize: number;
}

/**
 * Default MOSES configuration
 */
const DEFAULT_CONFIG: MOSESConfig = {
  populationSize: 100,
  maxGenerations: 50,
  mutationRate: 0.1,
  crossoverRate: 0.7,
  elitismCount: 5,
  tournamentSize: 3,
};

/**
 * Fitness evaluation function type
 */
export type FitnessFunction = (program: ProgramNode) => Promise<number>;

/**
 * MOSES Evolutionary Engine
 */
export class MOSESEngine {
  private config: MOSESConfig;
  private population: Candidate[] = [];
  private generation: number = 0;
  private bestCandidate: Candidate | null = null;
  private fitnessFunction?: FitnessFunction;

  constructor(config: Partial<MOSESConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the fitness evaluation function
   */
  setFitnessFunction(fn: FitnessFunction): void {
    this.fitnessFunction = fn;
  }

  /**
   * Initialize population with random programs
   */
  async initializePopulation(
    generateInitial: () => ProgramNode,
  ): Promise<void> {
    this.population = [];

    for (let i = 0; i < this.config.populationSize; i++) {
      const program = generateInitial();
      const fitness = await this.evaluateFitness(program);

      this.population.push({
        id: nanoid(),
        program,
        fitness,
        generation: 0,
      });
    }

    this.updateBest();
    log.info(`Initialized population of ${this.population.length} candidates`);
  }

  /**
   * Run evolution for specified number of generations
   */
  async evolve(generations?: number): Promise<Candidate> {
    const maxGen = generations || this.config.maxGenerations;

    for (let gen = 0; gen < maxGen; gen++) {
      this.generation++;
      await this.evolveGeneration();

      if (this.generation % 10 === 0) {
        log.info(
          `Generation ${this.generation}: Best fitness = ${this.bestCandidate?.fitness}`,
        );
      }
    }

    return this.bestCandidate!;
  }

  /**
   * Evolve one generation
   */
  private async evolveGeneration(): Promise<void> {
    const newPopulation: Candidate[] = [];

    // Elitism - keep best candidates
    const sorted = [...this.population].sort((a, b) => b.fitness - a.fitness);
    newPopulation.push(...sorted.slice(0, this.config.elitismCount));

    // Generate rest of population
    while (newPopulation.length < this.config.populationSize) {
      if (Math.random() < this.config.crossoverRate) {
        // Crossover
        const parent1 = this.selectParent();
        const parent2 = this.selectParent();
        const offspring = this.crossover(parent1.program, parent2.program);
        const fitness = await this.evaluateFitness(offspring);

        newPopulation.push({
          id: nanoid(),
          program: offspring,
          fitness,
          generation: this.generation,
        });
      } else {
        // Mutation
        const parent = this.selectParent();
        const mutated = this.mutate(parent.program);
        const fitness = await this.evaluateFitness(mutated);

        newPopulation.push({
          id: nanoid(),
          program: mutated,
          fitness,
          generation: this.generation,
        });
      }
    }

    this.population = newPopulation;
    this.updateBest();
  }

  /**
   * Select parent using tournament selection
   */
  private selectParent(): Candidate {
    const tournament: Candidate[] = [];

    for (let i = 0; i < this.config.tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[randomIndex]);
    }

    return tournament.reduce((best, current) =>
      current.fitness > best.fitness ? current : best,
    );
  }

  /**
   * Crossover two program trees
   */
  private crossover(parent1: ProgramNode, parent2: ProgramNode): ProgramNode {
    // Simple subtree crossover
    const p1Copy = this.copyProgram(parent1);
    const p2Copy = this.copyProgram(parent2);

    // Get random subtrees
    const subtree1 = this.getRandomSubtree(p1Copy);
    const subtree2 = this.getRandomSubtree(p2Copy);

    // Swap them (simplified - just return one of the subtrees)
    return Math.random() < 0.5 ? subtree1 : subtree2;
  }

  /**
   * Mutate a program tree
   */
  private mutate(program: ProgramNode): ProgramNode {
    const copy = this.copyProgram(program);

    if (Math.random() < this.config.mutationRate) {
      // Mutate node value
      if (copy.type === "terminal" && typeof copy.value === "number") {
        copy.value += (Math.random() - 0.5) * 2;
      } else if (copy.type === "function") {
        // Randomly change function
        const functions = ["+", "-", "*", "/", "if", "and", "or"];
        copy.value = functions[Math.floor(Math.random() * functions.length)];
      }

      // Recursively mutate children
      if (copy.children) {
        copy.children = copy.children.map((child) => this.mutate(child));
      }
    }

    return copy;
  }

  /**
   * Get a random subtree from program
   */
  private getRandomSubtree(program: ProgramNode): ProgramNode {
    const allNodes = this.collectNodes(program);
    return allNodes[Math.floor(Math.random() * allNodes.length)];
  }

  /**
   * Collect all nodes from a program tree
   */
  private collectNodes(program: ProgramNode): ProgramNode[] {
    const nodes: ProgramNode[] = [program];

    if (program.children) {
      for (const child of program.children) {
        nodes.push(...this.collectNodes(child));
      }
    }

    return nodes;
  }

  /**
   * Deep copy a program tree
   */
  private copyProgram(program: ProgramNode): ProgramNode {
    return {
      type: program.type,
      value: program.value,
      children: program.children?.map((child) => this.copyProgram(child)),
    };
  }

  /**
   * Evaluate fitness of a program
   */
  private async evaluateFitness(program: ProgramNode): Promise<number> {
    if (!this.fitnessFunction) {
      return Math.random(); // Default random fitness
    }

    try {
      return await this.fitnessFunction(program);
    } catch (error) {
      log.error("Fitness evaluation error:", error);
      return 0;
    }
  }

  /**
   * Update best candidate
   */
  private updateBest(): void {
    const best = this.population.reduce((best, current) =>
      current.fitness > best.fitness ? current : best,
    );

    if (!this.bestCandidate || best.fitness > this.bestCandidate.fitness) {
      this.bestCandidate = best;
    }
  }

  /**
   * Get current population
   */
  getPopulation(): Candidate[] {
    return [...this.population];
  }

  /**
   * Get best candidate
   */
  getBest(): Candidate | null {
    return this.bestCandidate;
  }

  /**
   * Get current generation
   */
  getGeneration(): number {
    return this.generation;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    generation: number;
    populationSize: number;
    bestFitness: number;
    averageFitness: number;
    diversityScore: number;
  } {
    const avgFitness =
      this.population.reduce((sum, c) => sum + c.fitness, 0) /
      this.population.length;

    // Simple diversity measure - count unique fitness values
    const uniqueFitness = new Set(this.population.map((c) => c.fitness)).size;
    const diversityScore = uniqueFitness / this.population.length;

    return {
      generation: this.generation,
      populationSize: this.population.length,
      bestFitness: this.bestCandidate?.fitness || 0,
      averageFitness: avgFitness,
      diversityScore,
    };
  }

  /**
   * Reset evolution
   */
  reset(): void {
    this.population = [];
    this.generation = 0;
    this.bestCandidate = null;
  }
}

/**
 * Helper to create simple program trees
 */
export class ProgramBuilder {
  /**
   * Create a constant terminal
   */
  static constant(value: number): ProgramNode {
    return {
      type: "terminal",
      value,
    };
  }

  /**
   * Create a variable terminal
   */
  static variable(name: string): ProgramNode {
    return {
      type: "variable",
      value: name,
    };
  }

  /**
   * Create a function node
   */
  static func(name: string, ...args: ProgramNode[]): ProgramNode {
    return {
      type: "function",
      value: name,
      children: args,
    };
  }

  /**
   * Generate random program of given depth
   */
  static randomProgram(maxDepth: number): ProgramNode {
    if (maxDepth === 0 || Math.random() < 0.3) {
      // Terminal
      return Math.random() < 0.5
        ? this.constant(Math.random() * 10 - 5)
        : this.variable(`x${Math.floor(Math.random() * 3)}`);
    } else {
      // Function
      const functions = ["+", "-", "*", "/"];
      const func = functions[Math.floor(Math.random() * functions.length)];
      const arity = 2; // Binary operators

      const children: ProgramNode[] = [];
      for (let i = 0; i < arity; i++) {
        children.push(this.randomProgram(maxDepth - 1));
      }

      return {
        type: "function",
        value: func,
        children,
      };
    }
  }
}
