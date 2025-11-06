/**
 * AtomSpace Visualization Component
 * Real-time visualization of atoms and their relationships
 */

import React, { useEffect, useRef, useState } from "react";
import { AtomNode } from "../../../opencog/types";
import styles from "../opencog.module.scss";

interface AtomSpaceVisualizationProps {
  atoms: AtomNode[];
  onAtomClick?: (atom: AtomNode) => void;
  width?: number;
  height?: number;
}

interface VisualAtom {
  atom: AtomNode;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function AtomSpaceVisualization({
  atoms,
  onAtomClick,
  width = 800,
  height = 600,
}: AtomSpaceVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visualAtoms, setVisualAtoms] = useState<VisualAtom[]>([]);
  const [selectedAtom, setSelectedAtom] = useState<AtomNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Initialize visual atoms
  useEffect(() => {
    const initialized = atoms.map((atom) => ({
      atom,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
    }));
    setVisualAtoms(initialized);
  }, [atoms, width, height]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, width, height);

      // Update positions with simple physics
      setVisualAtoms((prev) => {
        const updated = prev.map((va) => {
          let { x, y, vx, vy } = va;

          // Apply forces
          x += vx;
          y += vy;

          // Bounce off walls
          if (x < 0 || x > width) vx *= -0.8;
          if (y < 0 || y > height) vy *= -0.8;

          // Keep in bounds
          x = Math.max(0, Math.min(width, x));
          y = Math.max(0, Math.min(height, y));

          // Damping
          vx *= 0.99;
          vy *= 0.99;

          return { ...va, x, y, vx, vy };
        });

        // Draw connections
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;

        for (const va of updated) {
          if (va.atom.children) {
            for (const child of va.atom.children) {
              const childVa = updated.find((v) => atomsEqual(v.atom, child));
              if (childVa) {
                ctx.beginPath();
                ctx.moveTo(va.x, va.y);
                ctx.lineTo(childVa.x, childVa.y);
                ctx.stroke();
              }
            }
          }
        }

        // Draw atoms
        for (const va of updated) {
          const isSelected = selectedAtom && atomsEqual(va.atom, selectedAtom);

          // Draw circle
          ctx.beginPath();
          ctx.arc(va.x, va.y, isSelected ? 12 : 8, 0, Math.PI * 2);
          ctx.fillStyle = getAtomColor(va.atom);
          ctx.fill();

          if (isSelected) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Draw label
          if (va.atom.name) {
            ctx.fillStyle = "#fff";
            ctx.font = "10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(va.atom.name, va.x, va.y - 15);
          }
        }

        return updated;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [width, height, selectedAtom]);

  // Handle click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked atom
    for (const va of visualAtoms) {
      const distance = Math.sqrt((va.x - x) ** 2 + (va.y - y) ** 2);
      if (distance < 12) {
        setSelectedAtom(va.atom);
        onAtomClick?.(va.atom);
        return;
      }
    }

    setSelectedAtom(null);
  };

  return (
    <div className={styles.atomSpaceVisualization}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        style={{ cursor: "pointer" }}
      />
      {selectedAtom && (
        <div className={styles.atomDetails}>
          <h4>Selected Atom</h4>
          <div>
            <strong>Type:</strong> {selectedAtom.type}
          </div>
          {selectedAtom.name && (
            <div>
              <strong>Name:</strong> {selectedAtom.name}
            </div>
          )}
          {selectedAtom.truthValue && (
            <div>
              <strong>Truth Value:</strong>
              <div>Strength: {selectedAtom.truthValue.strength.toFixed(3)}</div>
              <div>
                Confidence: {selectedAtom.truthValue.confidence.toFixed(3)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getAtomColor(atom: AtomNode): string {
  // Color by atom type
  if (atom.type.includes("Node")) {
    return "#4a9eff";
  } else if (atom.type.includes("Link")) {
    return "#ff6b6b";
  }
  return "#888";
}

function atomsEqual(a1: AtomNode, a2: AtomNode): boolean {
  return a1.type === a2.type && a1.name === a2.name && a1.value === a2.value;
}
