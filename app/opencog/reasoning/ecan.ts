/**
 * ECAN (Economic Attention Allocation Network) Implementation
 * Manages attention allocation across atoms in the AtomSpace
 */

import { AtomNode } from "../types";
import log from "loglevel";

/**
 * Short-Term Importance (STI) - Attention currency for immediate focus
 * Long-Term Importance (LTI) - Historical significance
 * Very-Long-Term Importance (VLTI) - Permanent importance
 */
export interface AttentionValue {
  sti: number; // Short-term importance (-100 to 100)
  lti: number; // Long-term importance (0 to 100)
  vlti: number; // Very long-term importance (0 to 100)
}

export interface AtomWithAttention extends AtomNode {
  attentionValue?: AttentionValue;
}

/**
 * Attentional Focus Boundary (AFB)
 * Atoms above this STI threshold are "in focus"
 */
const AFB_THRESHOLD = 50;

/**
 * Forgetting threshold - atoms below this may be forgotten
 */
const FORGETTING_THRESHOLD = -50;

/**
 * ECAN Attention Allocation Engine
 */
export class ECANEngine {
  private atoms: Map<string, AtomWithAttention> = new Map();
  private totalSTI: number = 0;
  private maxSTI: number = 10000; // Total STI budget
  private spreadRate: number = 0.1; // How much STI spreads per tick
  private decayRate: number = 0.05; // How fast unused atoms decay
  private rentRate: number = 0.01; // Cost of staying in attentional focus

  /**
   * Add atom to attention network
   */
  addAtom(id: string, atom: AtomWithAttention): void {
    if (!atom.attentionValue) {
      atom.attentionValue = {
        sti: 0,
        lti: 0,
        vlti: 0,
      };
    }
    this.atoms.set(id, atom);
  }

  /**
   * Stimulate an atom - increase its STI
   */
  stimulate(atomId: string, amount: number): void {
    const atom = this.atoms.get(atomId);
    if (!atom || !atom.attentionValue) return;

    // Increase STI (capped at reasonable limits)
    atom.attentionValue.sti = Math.min(100, atom.attentionValue.sti + amount);
    this.totalSTI += amount;
  }

  /**
   * Run one cycle of attention spreading
   */
  spreadAttention(): void {
    const focusedAtoms = this.getAtomicFocus();

    for (const atom of focusedAtoms) {
      if (!atom.attentionValue) continue;

      // Spread STI to connected atoms
      if (atom.children) {
        const spreadAmount =
          atom.attentionValue.sti *
          this.spreadRate *
          (1 / atom.children.length);

        for (const child of atom.children) {
          // Find child in atom map and spread attention
          this.spreadToChild(child, spreadAmount);
        }
      }

      // Pay rent for being in focus
      atom.attentionValue.sti -= this.rentRate * atom.attentionValue.sti;
    }

    // Decay unfocused atoms
    this.decayUnfocusedAtoms();

    // Normalize STI to budget
    this.normalizeSTI();
  }

  /**
   * Spread attention to a child atom
   */
  private spreadToChild(child: AtomNode, amount: number): void {
    // Find the child in our atom map
    for (const [id, atom] of this.atoms.entries()) {
      if (this.atomsMatch(atom, child)) {
        if (!atom.attentionValue) {
          atom.attentionValue = { sti: 0, lti: 0, vlti: 0 };
        }
        atom.attentionValue.sti += amount;
        break;
      }
    }
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
   * Decay atoms not in focus
   */
  private decayUnfocusedAtoms(): void {
    for (const atom of this.atoms.values()) {
      if (!atom.attentionValue) continue;

      if (atom.attentionValue.sti < AFB_THRESHOLD) {
        atom.attentionValue.sti *= 1 - this.decayRate;

        // Forget very unimportant atoms
        if (atom.attentionValue.sti < FORGETTING_THRESHOLD) {
          atom.attentionValue.sti = FORGETTING_THRESHOLD;
        }
      }
    }
  }

  /**
   * Normalize total STI to stay within budget
   */
  private normalizeSTI(): void {
    if (this.totalSTI > this.maxSTI) {
      const scaleFactor = this.maxSTI / this.totalSTI;

      for (const atom of this.atoms.values()) {
        if (atom.attentionValue) {
          atom.attentionValue.sti *= scaleFactor;
        }
      }

      this.totalSTI = this.maxSTI;
    }
  }

  /**
   * Get atoms currently in attentional focus (above AFB)
   */
  getAtomicFocus(): AtomWithAttention[] {
    return Array.from(this.atoms.values()).filter(
      (atom) => atom.attentionValue && atom.attentionValue.sti >= AFB_THRESHOLD,
    );
  }

  /**
   * Get top N atoms by STI
   */
  getTopAtoms(n: number): AtomWithAttention[] {
    return Array.from(this.atoms.values())
      .sort((a, b) => {
        const stiA = a.attentionValue?.sti || 0;
        const stiB = b.attentionValue?.sti || 0;
        return stiB - stiA;
      })
      .slice(0, n);
  }

  /**
   * Update LTI based on STI history
   * Called periodically to convert short-term to long-term importance
   */
  updateLTI(): void {
    for (const atom of this.atoms.values()) {
      if (!atom.attentionValue) continue;

      // LTI increases slowly based on sustained high STI
      if (atom.attentionValue.sti > AFB_THRESHOLD) {
        atom.attentionValue.lti = Math.min(100, atom.attentionValue.lti + 0.1);
      } else {
        // Slowly decay LTI if not in focus
        atom.attentionValue.lti *= 0.99;
      }
    }
  }

  /**
   * Get attention statistics
   */
  getStatistics(): {
    totalAtoms: number;
    focusedAtoms: number;
    averageSTI: number;
    totalSTI: number;
  } {
    const focusedCount = this.getAtomicFocus().length;
    const avgSTI =
      this.atoms.size > 0
        ? Array.from(this.atoms.values()).reduce(
            (sum, atom) => sum + (atom.attentionValue?.sti || 0),
            0,
          ) / this.atoms.size
        : 0;

    return {
      totalAtoms: this.atoms.size,
      focusedAtoms: focusedCount,
      averageSTI: avgSTI,
      totalSTI: this.totalSTI,
    };
  }

  /**
   * Clear all atoms
   */
  clear(): void {
    this.atoms.clear();
    this.totalSTI = 0;
  }

  /**
   * Get all atoms
   */
  getAllAtoms(): AtomWithAttention[] {
    return Array.from(this.atoms.values());
  }

  /**
   * Set attention parameters
   */
  setParameters(params: {
    spreadRate?: number;
    decayRate?: number;
    rentRate?: number;
    maxSTI?: number;
  }): void {
    if (params.spreadRate !== undefined) this.spreadRate = params.spreadRate;
    if (params.decayRate !== undefined) this.decayRate = params.decayRate;
    if (params.rentRate !== undefined) this.rentRate = params.rentRate;
    if (params.maxSTI !== undefined) this.maxSTI = params.maxSTI;
  }
}

/**
 * Importance Diffusion Process
 * Spreads importance through the atom network based on connections
 */
export class ImportanceDiffusion {
  private ecan: ECANEngine;
  private diffusionRate: number = 0.15;

  constructor(ecan: ECANEngine) {
    this.ecan = ecan;
  }

  /**
   * Run importance diffusion for N steps
   */
  async diffuse(steps: number = 10): Promise<void> {
    for (let i = 0; i < steps; i++) {
      this.ecan.spreadAttention();

      // Every 10 steps, update LTI
      if (i % 10 === 0) {
        this.ecan.updateLTI();
      }
    }

    log.info(`Importance diffusion completed ${steps} steps`);
  }

  /**
   * Focus attention on specific atoms
   */
  focusOn(atomIds: string[], intensity: number = 50): void {
    for (const id of atomIds) {
      this.ecan.stimulate(id, intensity);
    }
  }
}
