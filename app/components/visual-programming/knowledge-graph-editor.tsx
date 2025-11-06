/**
 * Knowledge Graph Editor Component
 * Drag-and-drop visual editor for creating and editing knowledge graphs
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AtomNode, AtomType } from "../../opencog/types";
import styles from "./visual-programming.module.scss";

interface GraphNode {
  id: string;
  type: AtomType;
  name: string;
  x: number;
  y: number;
  selected: boolean;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

interface KnowledgeGraphEditorProps {
  atoms?: AtomNode[];
  onAtomsChange?: (atoms: AtomNode[]) => void;
  width?: number;
  height?: number;
  readonly?: boolean;
}

export function KnowledgeGraphEditor({
  atoms = [],
  onAtomsChange,
  width = 800,
  height = 600,
  readonly = false,
}: KnowledgeGraphEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [connecting, setConnecting] = useState<{
    sourceId: string;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  // Convert atoms to graph representation
  useEffect(() => {
    const graphNodes: GraphNode[] = [];
    const graphEdges: GraphEdge[] = [];
    const atomIdMap = new Map<AtomNode, string>();

    const generateId = (atom: AtomNode, index: number): string => {
      const id = `node-${index}-${atom.name || atom.type}`;
      atomIdMap.set(atom, id);
      return id;
    };

    atoms.forEach((atom, index) => {
      // Create node
      const nodeId = generateId(atom, index);
      graphNodes.push({
        id: nodeId,
        type: atom.type,
        name: atom.name || "",
        x: Math.random() * (width - 100) + 50,
        y: Math.random() * (height - 100) + 50,
        selected: false,
      });

      // Create edges from children
      if (atom.children) {
        atom.children.forEach((child, childIndex) => {
          const childId = `node-${index}-${childIndex}-${child.name || child.type}`;
          graphEdges.push({
            id: `edge-${index}-${childIndex}`,
            source: nodeId,
            target: childId,
            type: atom.type,
          });
        });
      }
    });

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [atoms, width, height]);

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw edges
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    edges.forEach((edge) => {
      const source = nodes.find((n) => n.id === edge.source);
      const target = nodes.find((n) => n.id === edge.target);

      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const arrowSize = 10;
        ctx.beginPath();
        ctx.moveTo(target.x, target.y);
        ctx.lineTo(
          target.x - arrowSize * Math.cos(angle - Math.PI / 6),
          target.y - arrowSize * Math.sin(angle - Math.PI / 6),
        );
        ctx.moveTo(target.x, target.y);
        ctx.lineTo(
          target.x - arrowSize * Math.cos(angle + Math.PI / 6),
          target.y - arrowSize * Math.sin(angle + Math.PI / 6),
        );
        ctx.stroke();
      }
    });

    // Draw connecting line
    if (connecting) {
      const source = nodes.find((n) => n.id === connecting.sourceId);
      if (source) {
        ctx.strokeStyle = "#0066cc";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(connecting.mouseX, connecting.mouseY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw nodes
    nodes.forEach((node) => {
      const radius = 30;

      // Node circle
      ctx.fillStyle = node.selected ? "#0066cc" : getNodeColor(node.type);
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Node border
      ctx.strokeStyle = node.selected ? "#003366" : "#333";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node label
      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = node.name || node.type;
      ctx.fillText(
        label.length > 10 ? label.substring(0, 10) + "..." : label,
        node.x,
        node.y,
      );
    });
  }, [nodes, edges, connecting, width, height]);

  // Get node color based on type
  const getNodeColor = (type: AtomType): string => {
    switch (type) {
      case AtomType.CONCEPT_NODE:
        return "#4CAF50";
      case AtomType.PREDICATE_NODE:
        return "#2196F3";
      case AtomType.VARIABLE_NODE:
        return "#FF9800";
      case AtomType.INHERITANCE_LINK:
        return "#9C27B0";
      case AtomType.EVALUATION_LINK:
        return "#F44336";
      default:
        return "#607D8B";
    }
  };

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readonly) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if clicked on a node
      const clickedNode = nodes.find((node) => {
        const dx = x - node.x;
        const dy = y - node.y;
        return Math.sqrt(dx * dx + dy * dy) <= 30;
      });

      if (clickedNode) {
        if (e.shiftKey) {
          // Start connecting
          setConnecting({
            sourceId: clickedNode.id,
            mouseX: x,
            mouseY: y,
          });
        } else {
          // Start dragging
          setDragging({
            nodeId: clickedNode.id,
            offsetX: x - clickedNode.x,
            offsetY: y - clickedNode.y,
          });
          setSelectedNode(clickedNode.id);

          // Update selection
          setNodes((prev) =>
            prev.map((n) => ({
              ...n,
              selected: n.id === clickedNode.id,
            })),
          );
        }
      } else {
        setSelectedNode(null);
        setNodes((prev) => prev.map((n) => ({ ...n, selected: false })));
      }
    },
    [nodes, readonly],
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readonly) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (dragging) {
        // Update node position
        setNodes((prev) =>
          prev.map((node) =>
            node.id === dragging.nodeId
              ? { ...node, x: x - dragging.offsetX, y: y - dragging.offsetY }
              : node,
          ),
        );
      } else if (connecting) {
        // Update connecting line
        setConnecting((prev) =>
          prev ? { ...prev, mouseX: x, mouseY: y } : null,
        );
      }
    },
    [dragging, connecting, readonly],
  );

  // Notify parent of changes
  const notifyChange = useCallback(() => {
    if (onAtomsChange) {
      // Convert graph back to atoms (simplified)
      const atomMap = new Map<string, AtomNode>();

      nodes.forEach((node) => {
        atomMap.set(node.id, {
          type: node.type,
          name: node.name,
          children: [],
        });
      });

      edges.forEach((edge) => {
        const sourceAtom = atomMap.get(edge.source);
        const targetAtom = atomMap.get(edge.target);
        if (sourceAtom && targetAtom) {
          sourceAtom.children = sourceAtom.children || [];
          sourceAtom.children.push(targetAtom);
        }
      });

      onAtomsChange(Array.from(atomMap.values()));
    }
  }, [nodes, edges, onAtomsChange]);

  // Handle mouse up
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readonly) return;

      if (connecting) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find target node
        const targetNode = nodes.find((node) => {
          const dx = x - node.x;
          const dy = y - node.y;
          return (
            Math.sqrt(dx * dx + dy * dy) <= 30 &&
            node.id !== connecting.sourceId
          );
        });

        if (targetNode) {
          // Create edge
          const newEdge: GraphEdge = {
            id: `edge-${Date.now()}`,
            source: connecting.sourceId,
            target: targetNode.id,
            type: "LINK",
          };
          setEdges((prev) => [...prev, newEdge]);
          // notifyChange will be called via effect when edges change
        }

        setConnecting(null);
      }

      setDragging(null);
    },
    [connecting, nodes, readonly],
  );

  // Add new node
  const addNode = (type: AtomType) => {
    if (readonly) return;

    const newNode: GraphNode = {
      id: `node-${Date.now()}`,
      type,
      name: "",
      x: width / 2 + Math.random() * 100 - 50,
      y: height / 2 + Math.random() * 100 - 50,
      selected: false,
    };

    setNodes((prev) => [...prev, newNode]);
    notifyChange();
  };

  // Delete selected node
  const deleteSelected = () => {
    if (readonly || !selectedNode) return;

    setNodes((prev) => prev.filter((n) => n.id !== selectedNode));
    setEdges((prev) =>
      prev.filter(
        (e) => e.source !== selectedNode && e.target !== selectedNode,
      ),
    );
    setSelectedNode(null);
    notifyChange();
  };

  return (
    <div className={styles.graphEditor}>
      <div className={styles.toolbar}>
        {!readonly && (
          <>
            <button onClick={() => addNode(AtomType.CONCEPT_NODE)}>
              Add Concept
            </button>
            <button onClick={() => addNode(AtomType.PREDICATE_NODE)}>
              Add Predicate
            </button>
            <button onClick={() => addNode(AtomType.VARIABLE_NODE)}>
              Add Variable
            </button>
            <button onClick={deleteSelected} disabled={!selectedNode}>
              Delete Selected
            </button>
          </>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={styles.canvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      <div className={styles.help}>
        <p>Click to select • Drag to move • Shift+Click to connect</p>
      </div>
    </div>
  );
}
