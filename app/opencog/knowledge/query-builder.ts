/**
 * Advanced Query Builder
 * Provides a structured way to query the AtomSpace
 */

import { AtomNode, TruthValue, AtomType } from "../types";
import log from "loglevel";

/**
 * Query criteria
 */
export interface QueryCriteria {
  type?: AtomType | AtomType[];
  name?: string | RegExp;
  minTruthStrength?: number;
  minTruthConfidence?: number;
  hasChildren?: boolean;
  childCount?: number | { min?: number; max?: number };
  depth?: number | { min?: number; max?: number };
  metadata?: Record<string, any>;
}

/**
 * Query result
 */
export interface QueryResult {
  atom: AtomNode;
  score: number; // Relevance score 0-1
  matches: string[]; // Which criteria matched
}

/**
 * Query Builder
 */
export class AtomQueryBuilder {
  private criteria: QueryCriteria[] = [];
  private combineMode: "AND" | "OR" = "AND";
  private limit?: number;
  private sortBy?: "relevance" | "truth-strength" | "truth-confidence" | "name";
  private sortOrder: "asc" | "desc" = "desc";

  /**
   * Add a query criterion
   */
  where(criterion: QueryCriteria): this {
    this.criteria.push(criterion);
    return this;
  }

  /**
   * Set combination mode for multiple criteria
   */
  combine(mode: "AND" | "OR"): this {
    this.combineMode = mode;
    return this;
  }

  /**
   * Limit number of results
   */
  setLimit(limit: number): this {
    this.limit = limit;
    return this;
  }

  /**
   * Set sorting
   */
  orderBy(
    field: "relevance" | "truth-strength" | "truth-confidence" | "name",
    order: "asc" | "desc" = "desc",
  ): this {
    this.sortBy = field;
    this.sortOrder = order;
    return this;
  }

  /**
   * Execute query
   */
  execute(atoms: AtomNode[]): QueryResult[] {
    let results: QueryResult[] = [];

    for (const atom of atoms) {
      const matches = this.evaluateAtom(atom);

      if (this.combineMode === "AND") {
        // All criteria must match
        if (matches.length === this.criteria.length) {
          results.push({
            atom,
            score: matches.length / this.criteria.length,
            matches,
          });
        }
      } else {
        // At least one criterion must match
        if (matches.length > 0) {
          results.push({
            atom,
            score: matches.length / this.criteria.length,
            matches,
          });
        }
      }
    }

    // Sort results
    if (this.sortBy) {
      results.sort((a, b) => {
        let valueA: any;
        let valueB: any;

        switch (this.sortBy) {
          case "relevance":
            valueA = a.score;
            valueB = b.score;
            break;
          case "truth-strength":
            valueA = a.atom.truthValue?.strength || 0;
            valueB = b.atom.truthValue?.strength || 0;
            break;
          case "truth-confidence":
            valueA = a.atom.truthValue?.confidence || 0;
            valueB = b.atom.truthValue?.confidence || 0;
            break;
          case "name":
            valueA = a.atom.name || "";
            valueB = b.atom.name || "";
            break;
        }

        if (this.sortOrder === "asc") {
          return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
          return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
      });
    }

    // Apply limit
    if (this.limit) {
      results = results.slice(0, this.limit);
    }

    log.info(`Query returned ${results.length} results`);
    return results;
  }

  /**
   * Evaluate if an atom matches criteria
   */
  private evaluateAtom(atom: AtomNode): string[] {
    const matches: string[] = [];

    for (let i = 0; i < this.criteria.length; i++) {
      const criterion = this.criteria[i];

      if (this.matchesCriterion(atom, criterion)) {
        matches.push(`criterion-${i}`);
      }
    }

    return matches;
  }

  /**
   * Check if atom matches a single criterion
   */
  private matchesCriterion(atom: AtomNode, criterion: QueryCriteria): boolean {
    // Type check
    if (criterion.type) {
      if (Array.isArray(criterion.type)) {
        if (!criterion.type.includes(atom.type as AtomType)) {
          return false;
        }
      } else {
        if (atom.type !== criterion.type) {
          return false;
        }
      }
    }

    // Name check
    if (criterion.name) {
      if (!atom.name) return false;

      if (criterion.name instanceof RegExp) {
        if (!criterion.name.test(atom.name)) {
          return false;
        }
      } else {
        if (atom.name !== criterion.name) {
          return false;
        }
      }
    }

    // Truth value checks
    if (criterion.minTruthStrength !== undefined) {
      if (
        !atom.truthValue ||
        atom.truthValue.strength < criterion.minTruthStrength
      ) {
        return false;
      }
    }

    if (criterion.minTruthConfidence !== undefined) {
      if (
        !atom.truthValue ||
        atom.truthValue.confidence < criterion.minTruthConfidence
      ) {
        return false;
      }
    }

    // Children checks
    if (criterion.hasChildren !== undefined) {
      const hasChildren = atom.children && atom.children.length > 0;
      if (hasChildren !== criterion.hasChildren) {
        return false;
      }
    }

    if (criterion.childCount !== undefined) {
      const count = atom.children?.length || 0;

      if (typeof criterion.childCount === "number") {
        if (count !== criterion.childCount) {
          return false;
        }
      } else {
        if (
          criterion.childCount.min !== undefined &&
          count < criterion.childCount.min
        ) {
          return false;
        }
        if (
          criterion.childCount.max !== undefined &&
          count > criterion.childCount.max
        ) {
          return false;
        }
      }
    }

    // Depth check
    if (criterion.depth !== undefined) {
      const depth = this.getAtomDepth(atom);

      if (typeof criterion.depth === "number") {
        if (depth !== criterion.depth) {
          return false;
        }
      } else {
        if (criterion.depth.min !== undefined && depth < criterion.depth.min) {
          return false;
        }
        if (criterion.depth.max !== undefined && depth > criterion.depth.max) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get depth of atom tree
   */
  private getAtomDepth(atom: AtomNode): number {
    if (!atom.children || atom.children.length === 0) {
      return 0;
    }

    return 1 + Math.max(...atom.children.map((c) => this.getAtomDepth(c)));
  }

  /**
   * Reset builder
   */
  reset(): this {
    this.criteria = [];
    this.combineMode = "AND";
    this.limit = undefined;
    this.sortBy = undefined;
    this.sortOrder = "desc";
    return this;
  }
}

/**
 * Pattern matching query
 */
export interface Pattern {
  type?: AtomType;
  name?: string;
  children?: (Pattern | "ANY" | "VARIABLE")[];
  truthValue?: Partial<TruthValue>;
}

/**
 * Pattern Matcher
 */
export class PatternMatcher {
  /**
   * Find atoms matching a pattern
   */
  match(atoms: AtomNode[], pattern: Pattern): AtomNode[] {
    const results: AtomNode[] = [];

    for (const atom of atoms) {
      if (this.matchesPattern(atom, pattern)) {
        results.push(atom);
      }

      // Also check children recursively
      if (atom.children) {
        results.push(...this.match(atom.children, pattern));
      }
    }

    return results;
  }

  /**
   * Check if atom matches pattern
   */
  private matchesPattern(atom: AtomNode, pattern: Pattern): boolean {
    // Type check
    if (pattern.type && atom.type !== pattern.type) {
      return false;
    }

    // Name check
    if (pattern.name && atom.name !== pattern.name) {
      return false;
    }

    // Truth value check
    if (pattern.truthValue) {
      if (!atom.truthValue) return false;

      if (
        pattern.truthValue.strength !== undefined &&
        atom.truthValue.strength !== pattern.truthValue.strength
      ) {
        return false;
      }

      if (
        pattern.truthValue.confidence !== undefined &&
        atom.truthValue.confidence !== pattern.truthValue.confidence
      ) {
        return false;
      }
    }

    // Children check
    if (pattern.children) {
      if (!atom.children || atom.children.length !== pattern.children.length) {
        return false;
      }

      for (let i = 0; i < pattern.children.length; i++) {
        const childPattern = pattern.children[i];

        if (childPattern === "ANY") {
          continue; // Accept any atom
        }

        if (childPattern === "VARIABLE") {
          continue; // Accept any atom (variable binding)
        }

        if (!this.matchesPattern(atom.children[i], childPattern as Pattern)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Extract variables from pattern match
   */
  extractVariables(
    atom: AtomNode,
    pattern: Pattern,
  ): Record<string, AtomNode> | null {
    const variables: Record<string, AtomNode> = {};

    if (!this.matchesPatternWithVariables(atom, pattern, variables)) {
      return null;
    }

    return variables;
  }

  /**
   * Match pattern and extract variables
   */
  private matchesPatternWithVariables(
    atom: AtomNode,
    pattern: Pattern,
    variables: Record<string, AtomNode>,
  ): boolean {
    // Same as matchesPattern but also extracts VARIABLE bindings
    // (simplified implementation)
    return this.matchesPattern(atom, pattern);
  }
}
