/**
 * Constraint-Based Layout Engine
 * Automatically arranges graph nodes using force-directed layout
 */

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fixed?: boolean;
}

export interface LayoutEdge {
  source: string;
  target: string;
  strength?: number;
}

export interface LayoutConfig {
  width: number;
  height: number;
  iterations?: number;
  attractionStrength?: number;
  repulsionStrength?: number;
  damping?: number;
  centerGravity?: number;
}

/**
 * Force-Directed Layout Engine
 */
export class ForceDirectedLayout {
  private config: Required<LayoutConfig>;
  private nodes: Map<string, LayoutNode> = new Map();
  private edges: LayoutEdge[] = [];

  constructor(config: LayoutConfig) {
    this.config = {
      width: config.width,
      height: config.height,
      iterations: config.iterations || 100,
      attractionStrength: config.attractionStrength || 0.01,
      repulsionStrength: config.repulsionStrength || 100,
      damping: config.damping || 0.9,
      centerGravity: config.centerGravity || 0.01,
    };
  }

  /**
   * Set nodes for layout
   */
  setNodes(nodes: LayoutNode[]): void {
    this.nodes.clear();
    nodes.forEach((node) => {
      this.nodes.set(node.id, {
        ...node,
        vx: 0,
        vy: 0,
      });
    });
  }

  /**
   * Set edges for layout
   */
  setEdges(edges: LayoutEdge[]): void {
    this.edges = edges.map((edge) => ({
      ...edge,
      strength: edge.strength || 1.0,
    }));
  }

  /**
   * Run the layout algorithm
   */
  compute(): LayoutNode[] {
    for (let i = 0; i < this.config.iterations; i++) {
      this.iterate();
    }

    return Array.from(this.nodes.values());
  }

  /**
   * Single iteration of force calculations
   */
  private iterate(): void {
    // Apply repulsive forces between all nodes
    this.applyRepulsiveForces();

    // Apply attractive forces along edges
    this.applyAttractiveForces();

    // Apply center gravity
    this.applyCenterGravity();

    // Update positions
    this.updatePositions();
  }

  /**
   * Apply repulsive forces (nodes push each other away)
   */
  private applyRepulsiveForces(): void {
    const nodeArray = Array.from(this.nodes.values());

    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const node1 = nodeArray[i];
        const node2 = nodeArray[j];

        if (node1.fixed && node2.fixed) continue;

        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        const distanceSq = dx * dx + dy * dy;

        if (distanceSq > 0) {
          const distance = Math.sqrt(distanceSq);
          const force =
            (this.config.repulsionStrength * this.config.repulsionStrength) /
            distanceSq;

          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          if (!node1.fixed) {
            node1.vx = (node1.vx || 0) - fx;
            node1.vy = (node1.vy || 0) - fy;
          }

          if (!node2.fixed) {
            node2.vx = (node2.vx || 0) + fx;
            node2.vy = (node2.vy || 0) + fy;
          }
        }
      }
    }
  }

  /**
   * Apply attractive forces (connected nodes pull together)
   */
  private applyAttractiveForces(): void {
    this.edges.forEach((edge) => {
      const source = this.nodes.get(edge.source);
      const target = this.nodes.get(edge.target);

      if (!source || !target) return;
      if (source.fixed && target.fixed) return;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const force =
          this.config.attractionStrength * distance * (edge.strength || 1.0);

        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        if (!source.fixed) {
          source.vx = (source.vx || 0) + fx;
          source.vy = (source.vy || 0) + fy;
        }

        if (!target.fixed) {
          target.vx = (target.vx || 0) - fx;
          target.vy = (target.vy || 0) - fy;
        }
      }
    });
  }

  /**
   * Apply center gravity (pull nodes towards center)
   */
  private applyCenterGravity(): void {
    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;

    this.nodes.forEach((node) => {
      if (node.fixed) return;

      const dx = centerX - node.x;
      const dy = centerY - node.y;

      node.vx = (node.vx || 0) + dx * this.config.centerGravity;
      node.vy = (node.vy || 0) + dy * this.config.centerGravity;
    });
  }

  /**
   * Update node positions based on velocities
   */
  private updatePositions(): void {
    this.nodes.forEach((node) => {
      if (node.fixed) return;

      // Apply damping
      node.vx = (node.vx || 0) * this.config.damping;
      node.vy = (node.vy || 0) * this.config.damping;

      // Update position
      node.x += node.vx || 0;
      node.y += node.vy || 0;

      // Keep within bounds
      const margin = 50;
      node.x = Math.max(margin, Math.min(this.config.width - margin, node.x));
      node.y = Math.max(margin, Math.min(this.config.height - margin, node.y));
    });
  }
}

/**
 * Hierarchical Layout Engine
 */
export class HierarchicalLayout {
  private config: LayoutConfig;
  private levels: Map<string, number> = new Map();

  constructor(config: LayoutConfig) {
    this.config = config;
  }

  /**
   * Compute hierarchical layout
   */
  compute(nodes: LayoutNode[], edges: LayoutEdge[]): LayoutNode[] {
    // Build adjacency list
    const adjacency = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    nodes.forEach((node) => {
      adjacency.set(node.id, new Set());
      inDegree.set(node.id, 0);
    });

    edges.forEach((edge) => {
      adjacency.get(edge.source)?.add(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Assign levels using topological sort
    const queue: string[] = [];
    nodes.forEach((node) => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
        this.levels.set(node.id, 0);
      }
    });

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const level = this.levels.get(nodeId) || 0;

      adjacency.get(nodeId)?.forEach((targetId) => {
        const currentLevel = this.levels.get(targetId) || 0;
        this.levels.set(targetId, Math.max(currentLevel, level + 1));

        const degree = (inDegree.get(targetId) || 1) - 1;
        inDegree.set(targetId, degree);

        if (degree === 0) {
          queue.push(targetId);
        }
      });
    }

    // Position nodes by level
    const levelGroups = new Map<number, string[]>();
    this.levels.forEach((level, nodeId) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(nodeId);
    });

    const maxLevel = Math.max(...Array.from(this.levels.values()));
    const levelHeight = this.config.height / (maxLevel + 1);

    const positioned: LayoutNode[] = [];

    levelGroups.forEach((nodeIds, level) => {
      const y = (level + 0.5) * levelHeight;
      const spacing = this.config.width / (nodeIds.length + 1);

      nodeIds.forEach((nodeId, index) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          positioned.push({
            ...node,
            x: (index + 1) * spacing,
            y: y,
          });
        }
      });
    });

    return positioned;
  }
}

/**
 * Circular Layout Engine
 */
export class CircularLayout {
  private config: LayoutConfig;

  constructor(config: LayoutConfig) {
    this.config = config;
  }

  /**
   * Compute circular layout
   */
  compute(nodes: LayoutNode[]): LayoutNode[] {
    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;
    const radius = Math.min(this.config.width, this.config.height) / 2 - 50;

    return nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }
}
