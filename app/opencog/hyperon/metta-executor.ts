/**
 * Native MeTTa Execution Engine
 * Provides execution capabilities for MeTTa code using Hyperon
 */

import { getHyperonFFI, HyperonResult } from "./ffi-bindings";

export interface MettaExecutionContext {
  variables: Record<string, any>;
  imports: string[];
  timeout?: number;
}

export interface MettaExecutionResult {
  success: boolean;
  result?: any;
  output?: string;
  error?: string;
  executionTime?: number;
  stats?: {
    atomsCreated: number;
    atomsMatched: number;
    reductionSteps: number;
  };
}

/**
 * Native MeTTa Executor using Hyperon
 */
export class NativeMettaExecutor {
  private ffi = getHyperonFFI();
  private context: MettaExecutionContext = {
    variables: {},
    imports: [],
  };

  constructor() {}

  /**
   * Initialize the executor
   */
  async initialize(): Promise<boolean> {
    return await this.ffi.initialize();
  }

  /**
   * Execute MeTTa code
   */
  async execute(
    code: string,
    context?: Partial<MettaExecutionContext>,
  ): Promise<MettaExecutionResult> {
    try {
      // Merge context
      const execContext = {
        ...this.context,
        ...context,
      };

      // Prepare code with context
      const preparedCode = this.prepareCode(code, execContext);

      // Execute through FFI
      const result: HyperonResult = await this.ffi.executeMetta(preparedCode);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Parse result
      return {
        success: true,
        result: result.data?.result,
        output: result.data?.output,
        executionTime: result.executionTime,
        stats: {
          atomsCreated: result.data?.atomsCreated || 0,
          atomsMatched: result.data?.atomsMatched || 0,
          reductionSteps: result.data?.reductionSteps || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Execute multiple MeTTa expressions
   */
  async executeBatch(
    expressions: string[],
    context?: Partial<MettaExecutionContext>,
  ): Promise<MettaExecutionResult[]> {
    const results: MettaExecutionResult[] = [];

    for (const expr of expressions) {
      const result = await this.execute(expr, context);
      results.push(result);

      // Stop on first error if needed
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Evaluate a MeTTa expression and return the result
   */
  async evaluate(expression: string): Promise<any> {
    const result = await this.execute(expression);
    return result.success ? result.result : null;
  }

  /**
   * Define a variable in the execution context
   */
  setVariable(name: string, value: any): void {
    this.context.variables[name] = value;
  }

  /**
   * Get a variable from the execution context
   */
  getVariable(name: string): any {
    return this.context.variables[name];
  }

  /**
   * Clear all variables
   */
  clearVariables(): void {
    this.context.variables = {};
  }

  /**
   * Add an import to the context
   */
  addImport(modulePath: string): void {
    if (!this.context.imports.includes(modulePath)) {
      this.context.imports.push(modulePath);
    }
  }

  /**
   * Prepare code with context (imports and variables)
   */
  private prepareCode(code: string, context: MettaExecutionContext): string {
    let prepared = "";

    // Add imports
    for (const importPath of context.imports) {
      prepared += `!(import! ${importPath})\n`;
    }

    // Add variable definitions
    for (const [name, value] of Object.entries(context.variables)) {
      prepared += `!(bind! ${name} ${this.valueToMetta(value)})\n`;
    }

    // Add the actual code
    prepared += code;

    return prepared;
  }

  /**
   * Convert JavaScript value to MeTTa representation
   */
  private valueToMetta(value: any): string {
    if (typeof value === "string") {
      return `"${value}"`;
    } else if (typeof value === "number") {
      return String(value);
    } else if (typeof value === "boolean") {
      return value ? "True" : "False";
    } else if (Array.isArray(value)) {
      return `(${value.map((v) => this.valueToMetta(v)).join(" ")})`;
    } else if (typeof value === "object" && value !== null) {
      // Convert object to MeTTa record/map representation
      const pairs = Object.entries(value).map(
        ([k, v]) => `(${k} ${this.valueToMetta(v)})`,
      );
      return `{${pairs.join(" ")}}`;
    }
    return String(value);
  }

  /**
   * Reset the executor to initial state
   */
  async reset(): Promise<void> {
    this.context = {
      variables: {},
      imports: [],
    };
    await this.ffi.clearAtomSpace();
  }

  /**
   * Shutdown the executor
   */
  async shutdown(): Promise<void> {
    await this.ffi.shutdown();
  }
}

// Executor presets for common tasks
export class MettaExecutorPresets {
  private executor: NativeMettaExecutor;

  constructor(executor: NativeMettaExecutor) {
    this.executor = executor;
  }

  /**
   * Execute a type query
   */
  async queryType(atomName: string): Promise<MettaExecutionResult> {
    return await this.executor.execute(`!(get-type ${atomName})`);
  }

  /**
   * Execute a match query
   */
  async match(pattern: string): Promise<MettaExecutionResult> {
    return await this.executor.execute(`!(match &self ${pattern} $result)`);
  }

  /**
   * Define a function
   */
  async defineFunction(
    name: string,
    params: string[],
    body: string,
  ): Promise<MettaExecutionResult> {
    const paramsStr = params.join(" ");
    return await this.executor.execute(`!(= (${name} ${paramsStr}) ${body})`);
  }

  /**
   * Define a type
   */
  async defineType(
    name: string,
    typeExpr: string,
  ): Promise<MettaExecutionResult> {
    return await this.executor.execute(`!(: ${name} ${typeExpr})`);
  }

  /**
   * Execute a reduction
   */
  async reduce(expression: string): Promise<MettaExecutionResult> {
    return await this.executor.execute(`!(reduce ${expression})`);
  }

  /**
   * Add knowledge to the space
   */
  async addKnowledge(assertion: string): Promise<MettaExecutionResult> {
    return await this.executor.execute(`!(add-atom &self ${assertion})`);
  }

  /**
   * Query knowledge from the space
   */
  async queryKnowledge(query: string): Promise<MettaExecutionResult> {
    return await this.executor.execute(`!(query &self ${query})`);
  }
}

// Singleton instance
let executorInstance: NativeMettaExecutor | null = null;

/**
 * Get the MeTTa executor singleton
 */
export function getMettaExecutor(): NativeMettaExecutor {
  if (!executorInstance) {
    executorInstance = new NativeMettaExecutor();
  }
  return executorInstance;
}

/**
 * Get executor presets
 */
export function getMettaPresets(): MettaExecutorPresets {
  return new MettaExecutorPresets(getMettaExecutor());
}
