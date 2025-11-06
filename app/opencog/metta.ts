/**
 * MeTTa Parser and Generator
 * Handles conversion between MeTTa expressions and structured data
 */

import { MeTTaExpression } from "./types";

export class MeTTaParser {
  /**
   * Parse MeTTa expression string into structured MeTTaExpression
   * Example: "(= (fib 0) 1)"
   * Example: "(: Human Type)"
   * Example: "(-> Person (knows Person))"
   */
  static parse(metta: string): MeTTaExpression {
    const trimmed = metta.trim();

    // Handle atoms (simple values)
    if (!trimmed.startsWith("(")) {
      return {
        type: trimmed.startsWith("$") ? "variable" : "atom",
        value: trimmed,
      };
    }

    // Parse expression
    const tokens = this.tokenize(trimmed);
    return this.parseTokens(tokens);
  }

  private static tokenize(str: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === "(") {
        if (current.trim()) {
          tokens.push(current.trim());
          current = "";
        }
        depth++;
        tokens.push("(");
      } else if (char === ")") {
        if (current.trim()) {
          tokens.push(current.trim());
          current = "";
        }
        depth--;
        tokens.push(")");
      } else if (/\s/.test(char) && depth === 0) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = "";
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      tokens.push(current.trim());
    }

    return tokens;
  }

  private static parseTokens(tokens: string[]): MeTTaExpression {
    let index = 0;

    const parseExpr = (): MeTTaExpression => {
      if (tokens[index] !== "(") {
        const token = tokens[index++];
        return {
          type: token.startsWith("$") ? "variable" : "atom",
          value: token,
        };
      }

      index++; // skip '('
      const elements: MeTTaExpression[] = [];

      while (index < tokens.length && tokens[index] !== ")") {
        elements.push(parseExpr());
      }

      index++; // skip ')'

      return {
        type: "expression",
        value: elements,
      };
    };

    return parseExpr();
  }

  /**
   * Generate MeTTa expression from MeTTaExpression structure
   */
  static generate(expr: MeTTaExpression): string {
    if (expr.type === "atom" || expr.type === "variable") {
      return String(expr.value);
    }

    if (Array.isArray(expr.value)) {
      const elements = expr.value.map((e) => this.generate(e)).join(" ");
      return `(${elements})`;
    }

    return String(expr.value);
  }

  /**
   * Validate MeTTa syntax
   */
  static validate(metta: string): { valid: boolean; error?: string } {
    try {
      this.parse(metta);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid MeTTa",
      };
    }
  }

  /**
   * Create common MeTTa patterns
   */
  static patterns = {
    // Type declaration: (: name Type)
    typeDeclaration(name: string, type: string): MeTTaExpression {
      return {
        type: "expression",
        value: [
          { type: "atom", value: ":" },
          { type: "atom", value: name },
          { type: "atom", value: type },
        ],
      };
    },

    // Function definition: (= (func args) body)
    functionDefinition(
      name: string,
      args: string[],
      body: MeTTaExpression,
    ): MeTTaExpression {
      return {
        type: "expression",
        value: [
          { type: "atom", value: "=" },
          {
            type: "expression",
            value: [
              { type: "atom", value: name },
              ...args.map((arg) => ({ type: "atom" as const, value: arg })),
            ],
          },
          body,
        ],
      };
    },

    // Arrow type: (-> Type1 Type2)
    arrowType(from: string, to: string): MeTTaExpression {
      return {
        type: "expression",
        value: [
          { type: "atom", value: "->" },
          { type: "atom", value: from },
          { type: "atom", value: to },
        ],
      };
    },

    // Match expression: (match expr pattern body)
    match(
      expr: MeTTaExpression,
      pattern: MeTTaExpression,
      body: MeTTaExpression,
    ): MeTTaExpression {
      return {
        type: "expression",
        value: [{ type: "atom", value: "match" }, expr, pattern, body],
      };
    },
  };
}
