/**
 * Knowledge Base Export/Import
 * Handles serialization and deserialization of OpenCog knowledge bases
 */

import { AtomNode, TruthValue, AtomType } from "../types";
import { AtomeseParser } from "../atomese";
import { MeTTaParser } from "../metta";
import log from "loglevel";

/**
 * Knowledge base format
 */
export interface KnowledgeBase {
  version: string;
  created: number;
  modified: number;
  format: "atomese" | "metta" | "json";
  atoms: AtomNode[];
  metadata?: Record<string, any>;
}

/**
 * Export knowledge base to JSON
 */
export function exportKnowledgeBaseJSON(
  atoms: AtomNode[],
  metadata?: Record<string, any>,
): string {
  const kb: KnowledgeBase = {
    version: "1.0.0",
    created: Date.now(),
    modified: Date.now(),
    format: "json",
    atoms,
    metadata,
  };

  return JSON.stringify(kb, null, 2);
}

/**
 * Export knowledge base to Atomese
 */
export function exportKnowledgeBaseAtomese(atoms: AtomNode[]): string {
  const atomeseClauses: string[] = [];

  for (const atom of atoms) {
    try {
      const atomese = AtomeseParser.generate(atom);
      atomeseClauses.push(atomese);
    } catch (error) {
      log.error("Failed to convert atom to Atomese:", atom, error);
    }
  }

  return atomeseClauses.join("\n\n");
}

/**
 * Export knowledge base to MeTTa
 */
export function exportKnowledgeBaseMetta(atoms: AtomNode[]): string {
  const mettaExpressions: string[] = [];

  for (const atom of atoms) {
    try {
      // Simple conversion - create type declarations and facts
      if (atom.name) {
        // Check if it's a Node type using enum
        if (
          atom.type === AtomType.CONCEPT_NODE ||
          atom.type === AtomType.PREDICATE_NODE ||
          atom.type === AtomType.VARIABLE_NODE
        ) {
          mettaExpressions.push(`(: ${atom.name} Type)`);
        }

        if (atom.children && atom.children.length > 0) {
          const childNames = atom.children
            .map((c) => c.name || "Unknown")
            .join(" ");
          mettaExpressions.push(`(${atom.name} ${childNames})`);
        }
      }
    } catch (error) {
      log.error("Failed to convert atom to MeTTa:", atom, error);
    }
  }

  return mettaExpressions.join("\n");
}

/**
 * Import knowledge base from JSON
 */
export function importKnowledgeBaseJSON(jsonString: string): AtomNode[] {
  try {
    const kb: KnowledgeBase = JSON.parse(jsonString);

    if (!kb.atoms || !Array.isArray(kb.atoms)) {
      throw new Error("Invalid knowledge base format: missing atoms array");
    }

    log.info(
      `Imported knowledge base with ${kb.atoms.length} atoms (version ${kb.version})`,
    );
    return kb.atoms;
  } catch (error) {
    log.error("Failed to import knowledge base:", error);
    throw error;
  }
}

/**
 * Import knowledge base from Atomese
 */
export function importKnowledgeBaseAtomese(atomeseString: string): AtomNode[] {
  const atoms: AtomNode[] = [];
  const lines = atomeseString.split("\n");

  let currentClause = "";
  let openParens = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) continue; // Skip empty lines and comments

    currentClause += " " + trimmed;

    // Count parentheses
    for (const char of trimmed) {
      if (char === "(") openParens++;
      if (char === ")") openParens--;
    }

    // Complete clause
    if (openParens === 0 && currentClause.trim()) {
      try {
        const atom = AtomeseParser.parse(currentClause.trim());
        atoms.push(atom);
      } catch (error) {
        log.error("Failed to parse Atomese clause:", currentClause, error);
      }
      currentClause = "";
    }
  }

  log.info(`Imported ${atoms.length} atoms from Atomese`);
  return atoms;
}

/**
 * Import knowledge base from MeTTa
 */
export function importKnowledgeBaseMetta(mettaString: string): AtomNode[] {
  const atoms: AtomNode[] = [];
  const lines = mettaString.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) continue; // Skip empty lines and comments

    try {
      const expr = MeTTaParser.parse(trimmed);
      // Convert MeTTa expression to AtomNode
      const atom = convertMettaToAtom(expr);
      if (atom) {
        atoms.push(atom);
      }
    } catch (error) {
      log.error("Failed to parse MeTTa expression:", trimmed, error);
    }
  }

  log.info(`Imported ${atoms.length} atoms from MeTTa`);
  return atoms;
}

/**
 * Convert MeTTa expression to AtomNode
 * (Simple conversion for basic cases)
 */
function convertMettaToAtom(expr: any): AtomNode | null {
  if (typeof expr === "string") {
    return {
      type: AtomType.CONCEPT_NODE,
      name: expr,
    };
  }

  if (Array.isArray(expr.value) && expr.value.length > 0) {
    const first = expr.value[0];

    // Type declaration: (: name Type)
    if (first.value === ":" && expr.value.length === 3) {
      return {
        type: AtomType.CONCEPT_NODE,
        name: String(expr.value[1].value),
      };
    }

    // General expression
    return {
      type: AtomType.EVALUATION_LINK,
      name: String(first.value),
      children: expr.value
        .slice(1)
        .map((v: any) => convertMettaToAtom(v))
        .filter(Boolean),
    };
  }

  return null;
}

/**
 * Export to downloadable file
 */
export function downloadKnowledgeBase(
  atoms: AtomNode[],
  format: "json" | "atomese" | "metta",
  filename?: string,
): void {
  let content: string;
  let extension: string;

  switch (format) {
    case "json":
      content = exportKnowledgeBaseJSON(atoms);
      extension = "json";
      break;
    case "atomese":
      content = exportKnowledgeBaseAtomese(atoms);
      extension = "scm";
      break;
    case "metta":
      content = exportKnowledgeBaseMetta(atoms);
      extension = "metta";
      break;
  }

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `knowledge-base-${Date.now()}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  log.info(`Downloaded knowledge base as ${format}`);
}

/**
 * Import from uploaded file
 */
export async function uploadKnowledgeBase(
  file: File,
): Promise<{ atoms: AtomNode[]; format: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        reject(new Error("Failed to read file"));
        return;
      }

      // Detect format
      let format: string;
      let atoms: AtomNode[];

      if (file.name.endsWith(".json")) {
        format = "json";
        atoms = importKnowledgeBaseJSON(content);
      } else if (file.name.endsWith(".scm")) {
        format = "atomese";
        atoms = importKnowledgeBaseAtomese(content);
      } else if (file.name.endsWith(".metta")) {
        format = "metta";
        atoms = importKnowledgeBaseMetta(content);
      } else {
        // Try to auto-detect
        try {
          atoms = importKnowledgeBaseJSON(content);
          format = "json";
        } catch {
          try {
            atoms = importKnowledgeBaseAtomese(content);
            format = "atomese";
          } catch {
            atoms = importKnowledgeBaseMetta(content);
            format = "metta";
          }
        }
      }

      resolve({ atoms, format });
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Merge two knowledge bases
 */
export function mergeKnowledgeBases(
  kb1: AtomNode[],
  kb2: AtomNode[],
  deduplicateStrategy: "keep-first" | "keep-last" | "merge-tv" = "keep-first",
): AtomNode[] {
  const merged = [...kb1];
  const existingAtoms = new Map<string, number>();

  // Index existing atoms
  kb1.forEach((atom, index) => {
    const key = atomKey(atom);
    existingAtoms.set(key, index);
  });

  // Add or merge atoms from kb2
  for (const atom of kb2) {
    const key = atomKey(atom);
    const existingIndex = existingAtoms.get(key);

    if (existingIndex !== undefined) {
      // Atom exists
      if (deduplicateStrategy === "keep-last") {
        merged[existingIndex] = atom;
      } else if (
        deduplicateStrategy === "merge-tv" &&
        atom.truthValue &&
        merged[existingIndex].truthValue
      ) {
        // Merge truth values (simple average)
        const tv1 = merged[existingIndex].truthValue!;
        const tv2 = atom.truthValue;
        merged[existingIndex].truthValue = {
          strength: (tv1.strength + tv2.strength) / 2,
          confidence: (tv1.confidence + tv2.confidence) / 2,
        };
      }
      // else keep-first: do nothing
    } else {
      // New atom
      merged.push(atom);
      existingAtoms.set(key, merged.length - 1);
    }
  }

  return merged;
}

/**
 * Generate unique key for an atom
 */
function atomKey(atom: AtomNode): string {
  const parts = [atom.type, atom.name || "", atom.value || ""];

  if (atom.children) {
    parts.push(...atom.children.map(atomKey));
  }

  return parts.join("|");
}
