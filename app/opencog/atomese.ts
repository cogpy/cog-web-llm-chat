/**
 * Atomese Parser and Generator
 * Handles conversion between Atomese S-expressions and structured data
 */

import { AtomNode, AtomType, TruthValue } from "./types";

export class AtomeseParser {
  /**
   * Parse Atomese S-expression string into structured AtomNode
   * Example: "(InheritanceLink (ConceptNode "cat") (ConceptNode "animal"))"
   */
  static parse(atomese: string): AtomNode {
    const trimmed = atomese.trim();

    // Handle simple nodes without children
    if (!trimmed.startsWith("(")) {
      return {
        type: AtomType.CONCEPT_NODE,
        name: trimmed.replace(/"/g, ""),
      };
    }

    // Parse S-expression
    const tokens = this.tokenize(trimmed);
    return this.parseTokens(tokens);
  }

  private static tokenize(str: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuotes = false;
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (!inQuotes && char === "(") {
        if (current.trim()) {
          tokens.push(current.trim());
          current = "";
        }
        depth++;
        tokens.push("(");
      } else if (!inQuotes && char === ")") {
        if (current.trim()) {
          tokens.push(current.trim());
          current = "";
        }
        depth--;
        tokens.push(")");
      } else if (!inQuotes && /\s/.test(char)) {
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

  private static parseTokens(tokens: string[]): AtomNode {
    let index = 0;

    const parseNode = (): AtomNode => {
      if (tokens[index] !== "(") {
        const token = tokens[index++];
        return {
          type: AtomType.CONCEPT_NODE,
          name: token.replace(/"/g, ""),
        };
      }

      index++; // skip '('
      const typeName = tokens[index++];
      const type = this.parseAtomType(typeName);
      const children: AtomNode[] = [];

      while (index < tokens.length && tokens[index] !== ")") {
        children.push(parseNode());
      }

      index++; // skip ')'

      const node: AtomNode = { type, children };

      // Extract name from first child if it's a simple node
      if (children.length > 0 && !children[0].children) {
        node.name = children[0].name;
        node.children = children.slice(1);
      }

      return node;
    };

    return parseNode();
  }

  private static parseAtomType(typeName: string): AtomType {
    const normalized = typeName.toUpperCase().replace(/LINK$|NODE$/, "");

    switch (normalized) {
      case "CONCEPT":
        return AtomType.CONCEPT_NODE;
      case "PREDICATE":
        return AtomType.PREDICATE_NODE;
      case "VARIABLE":
        return AtomType.VARIABLE_NODE;
      case "LIST":
        return AtomType.LIST_LINK;
      case "INHERITANCE":
        return AtomType.INHERITANCE_LINK;
      case "SIMILARITY":
        return AtomType.SIMILARITY_LINK;
      case "EVALUATION":
        return AtomType.EVALUATION_LINK;
      case "IMPLICATION":
        return AtomType.IMPLICATION_LINK;
      case "AND":
        return AtomType.AND_LINK;
      case "OR":
        return AtomType.OR_LINK;
      case "NOT":
        return AtomType.NOT_LINK;
      default:
        return AtomType.CONCEPT_NODE;
    }
  }

  /**
   * Generate Atomese S-expression from AtomNode structure
   */
  static generate(node: AtomNode): string {
    if (!node.children || node.children.length === 0) {
      const name = node.name ? `"${node.name}"` : '""';
      return `(${node.type} ${name}${this.generateTruthValue(node.truthValue)})`;
    }

    const childrenStr = node.children
      .map((child) => this.generate(child))
      .join(" ");

    const name = node.name ? ` "${node.name}"` : "";
    return `(${node.type}${name} ${childrenStr}${this.generateTruthValue(node.truthValue)})`;
  }

  private static generateTruthValue(tv?: TruthValue): string {
    if (!tv) return "";
    return ` (stv ${tv.strength.toFixed(3)} ${tv.confidence.toFixed(3)})`;
  }

  /**
   * Validate Atomese syntax
   */
  static validate(atomese: string): { valid: boolean; error?: string } {
    try {
      this.parse(atomese);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid Atomese",
      };
    }
  }
}
