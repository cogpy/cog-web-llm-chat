/**
 * PLN (Probabilistic Logic Networks) Implementation
 * Provides probabilistic reasoning capabilities for OpenCog
 */

import { AtomNode, TruthValue } from "../types";
import log from "loglevel";

/**
 * Truth value revision - combines evidence from multiple sources
 */
export function revisionRule(tv1: TruthValue, tv2: TruthValue): TruthValue {
  // PLN revision formula
  const k = 1; // Evidence weight parameter
  const w1 = tv1.confidence / (1 - tv1.confidence);
  const w2 = tv2.confidence / (1 - tv2.confidence);

  const strength = (w1 * tv1.strength + w2 * tv2.strength) / (w1 + w2);
  const confidence = (w1 + w2) / (w1 + w2 + k);

  return { strength, confidence };
}

/**
 * Deduction rule: If A->B and B->C, infer A->C
 */
export function deductionRule(tvAB: TruthValue, tvBC: TruthValue): TruthValue {
  // PLN deduction formula
  const strength = tvAB.strength * tvBC.strength;
  const confidence =
    tvAB.confidence * tvBC.confidence * tvAB.strength * tvBC.strength;

  return { strength, confidence };
}

/**
 * Induction rule: If A->B, infer B->A with inverted strength
 */
export function inductionRule(
  tvAB: TruthValue,
  nA: number,
  nB: number,
): TruthValue {
  // PLN induction formula with size dependency
  const strength = tvAB.strength * (nA / nB);
  const confidence = tvAB.confidence * Math.sqrt(nA / (nA + nB));

  return { strength, confidence };
}

/**
 * Abduction rule: If A->B and C->B, infer A->C
 */
export function abductionRule(tvAB: TruthValue, tvCB: TruthValue): TruthValue {
  // Simplified abduction
  const strength = tvAB.strength * tvCB.strength;
  const confidence = tvAB.confidence * tvCB.confidence * 0.8; // Reduce confidence

  return { strength, confidence };
}

/**
 * Conjunction rule: If A and B, combine truth values
 */
export function conjunctionRule(tv1: TruthValue, tv2: TruthValue): TruthValue {
  const strength = tv1.strength * tv2.strength;
  const confidence = tv1.confidence * tv2.confidence;

  return { strength, confidence };
}

/**
 * Disjunction rule: If A or B, combine truth values
 */
export function disjunctionRule(tv1: TruthValue, tv2: TruthValue): TruthValue {
  const strength = tv1.strength + tv2.strength - tv1.strength * tv2.strength;
  const confidence = tv1.confidence * tv2.confidence;

  return { strength, confidence };
}

/**
 * Negation rule: Negate truth value
 */
export function negationRule(tv: TruthValue): TruthValue {
  return {
    strength: 1 - tv.strength,
    confidence: tv.confidence,
  };
}

/**
 * Simple forward chainer for PLN inference
 */
export class PLNForwardChainer {
  private knowledgeBase: Map<string, AtomNode> = new Map();
  private maxIterations: number = 100;

  constructor(maxIterations: number = 100) {
    this.maxIterations = maxIterations;
  }

  /**
   * Add atom to knowledge base
   */
  addAtom(id: string, atom: AtomNode): void {
    this.knowledgeBase.set(id, atom);
  }

  /**
   * Apply inference rules to derive new knowledge
   */
  async infer(targetQuery?: string): Promise<AtomNode[]> {
    const derivedAtoms: AtomNode[] = [];
    let iterations = 0;

    while (iterations < this.maxIterations) {
      const newAtoms = this.applyInferenceRules();

      if (newAtoms.length === 0) {
        break; // No new knowledge derived
      }

      derivedAtoms.push(...newAtoms);
      iterations++;
    }

    log.info(`PLN inference completed in ${iterations} iterations`);
    return derivedAtoms;
  }

  /**
   * Apply all available inference rules
   */
  private applyInferenceRules(): AtomNode[] {
    const newAtoms: AtomNode[] = [];
    const atoms = Array.from(this.knowledgeBase.values());

    // Apply deduction: A->B, B->C => A->C
    for (let i = 0; i < atoms.length; i++) {
      for (let j = 0; j < atoms.length; j++) {
        if (this.isImplication(atoms[i]) && this.isImplication(atoms[j])) {
          const derived = this.tryDeduction(atoms[i], atoms[j]);
          if (derived) {
            newAtoms.push(derived);
          }
        }
      }
    }

    return newAtoms;
  }

  /**
   * Check if atom is an implication link
   */
  private isImplication(atom: AtomNode): boolean {
    return atom.type === "ImplicationLink" && atom.children?.length === 2;
  }

  /**
   * Try to apply deduction rule
   */
  private tryDeduction(atom1: AtomNode, atom2: AtomNode): AtomNode | null {
    if (!atom1.children || !atom2.children) return null;
    if (!atom1.truthValue || !atom2.truthValue) return null;

    // Check if B matches: A->B and B->C
    const B1 = atom1.children[1];
    const B2 = atom2.children[0];

    if (this.atomsMatch(B1, B2)) {
      const A = atom1.children[0];
      const C = atom2.children[1];

      return {
        type: atom1.type, // Use the same type from the input atom
        children: [A, C],
        truthValue: deductionRule(atom1.truthValue, atom2.truthValue),
      };
    }

    return null;
  }

  /**
   * Check if two atoms match
   */
  private atomsMatch(atom1: AtomNode, atom2: AtomNode): boolean {
    return (
      atom1.type === atom2.type &&
      atom1.name === atom2.name &&
      atom1.value === atom2.value
    );
  }

  /**
   * Get all derived atoms
   */
  getKnowledgeBase(): AtomNode[] {
    return Array.from(this.knowledgeBase.values());
  }

  /**
   * Clear knowledge base
   */
  clear(): void {
    this.knowledgeBase.clear();
  }
}

/**
 * PLN Reasoning Engine
 */
export class PLNReasoner {
  private forwardChainer: PLNForwardChainer;

  constructor() {
    this.forwardChainer = new PLNForwardChainer();
  }

  /**
   * Perform reasoning on a set of atoms
   */
  async reason(atoms: AtomNode[]): Promise<{
    derived: AtomNode[];
    confidence: number;
  }> {
    // Add atoms to knowledge base
    atoms.forEach((atom, index) => {
      this.forwardChainer.addAtom(`atom_${index}`, atom);
    });

    // Run inference
    const derived = await this.forwardChainer.infer();

    // Calculate overall confidence
    const avgConfidence =
      derived.reduce(
        (sum, atom) => sum + (atom.truthValue?.confidence || 0),
        0,
      ) / (derived.length || 1);

    return {
      derived,
      confidence: avgConfidence,
    };
  }

  /**
   * Evaluate a query against the knowledge base
   */
  async query(queryAtom: AtomNode): Promise<TruthValue | null> {
    const kb = this.forwardChainer.getKnowledgeBase();

    // Simple query matching
    for (const atom of kb) {
      if (this.atomsEqual(atom, queryAtom)) {
        return atom.truthValue || null;
      }
    }

    return null;
  }

  /**
   * Check if two atoms are equal
   */
  private atomsEqual(atom1: AtomNode, atom2: AtomNode): boolean {
    if (atom1.type !== atom2.type) return false;
    if (atom1.name !== atom2.name) return false;
    if (atom1.value !== atom2.value) return false;

    if (atom1.children && atom2.children) {
      if (atom1.children.length !== atom2.children.length) return false;
      return atom1.children.every((child, i) =>
        this.atomsEqual(child, atom2.children![i]),
      );
    }

    return true;
  }

  /**
   * Clear the reasoner
   */
  clear(): void {
    this.forwardChainer.clear();
  }
}
