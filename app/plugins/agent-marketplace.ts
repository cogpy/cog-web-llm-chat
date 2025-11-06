/**
 * Agent Marketplace
 * Discovery, installation, and management of agent plugins
 */

import { PluginManifest, getPluginManager } from "./plugin-system";

export interface MarketplaceAgent {
  manifest: PluginManifest;
  downloads: number;
  rating: number;
  reviews: number;
  screenshots?: string[];
  readme?: string;
  changelog?: string;
  verified: boolean;
  category: string[];
  tags: string[];
}

export interface AgentSearchQuery {
  query?: string;
  category?: string;
  tags?: string[];
  minRating?: number;
  verified?: boolean;
  sortBy?: "downloads" | "rating" | "newest" | "name";
}

/**
 * Agent Marketplace Manager
 */
export class AgentMarketplace {
  private agents: Map<string, MarketplaceAgent> = new Map();
  private categories: Set<string> = new Set();
  private pluginManager = getPluginManager();

  constructor() {
    this.initializeCategories();
    this.loadMockAgents();
  }

  /**
   * Initialize agent categories
   */
  private initializeCategories(): void {
    const categories = [
      "Reasoning",
      "Translation",
      "Knowledge Management",
      "Planning",
      "Learning",
      "Visualization",
      "Integration",
      "Utilities",
    ];

    categories.forEach((cat) => this.categories.add(cat));
  }

  /**
   * Load mock agents for demonstration
   */
  private loadMockAgents(): void {
    const mockAgents: MarketplaceAgent[] = [
      {
        manifest: {
          id: "advanced-reasoning-agent",
          name: "Advanced Reasoning Agent",
          version: "1.0.0",
          description: "Advanced PLN reasoning with custom inference rules",
          author: "OpenCog Team",
          capabilities: ["reasoning:pln", "reasoning:custom"],
          permissions: [
            {
              type: "opencog",
              scope: "atomspace:read,atomspace:write",
              description: "Access to AtomSpace for reasoning",
            },
          ],
          entryPoint: "index.js",
        },
        downloads: 1523,
        rating: 4.8,
        reviews: 45,
        verified: true,
        category: ["Reasoning"],
        tags: ["pln", "inference", "logic"],
      },
      {
        manifest: {
          id: "multi-language-translator",
          name: "Multi-Language Translator",
          version: "2.1.0",
          description:
            "Translate between 50+ natural languages and formal languages",
          author: "CogTeam",
          capabilities: [
            "translation:nl-to-metta",
            "translation:metta-to-nl",
            "translation:multi-lang",
          ],
          permissions: [
            {
              type: "llm",
              description: "Access to LLM for translation",
            },
          ],
          entryPoint: "translator.js",
        },
        downloads: 2847,
        rating: 4.6,
        reviews: 89,
        verified: true,
        category: ["Translation"],
        tags: ["translation", "nlp", "multilingual"],
      },
      {
        manifest: {
          id: "knowledge-graph-builder",
          name: "Knowledge Graph Builder",
          version: "1.5.0",
          description: "Automatically build knowledge graphs from text",
          author: "GraphAI",
          capabilities: [
            "atomspace:write",
            "translation:nl-to-metta",
            "ui:panel",
          ],
          permissions: [
            {
              type: "opencog",
              scope: "atomspace:write",
              description: "Create knowledge graph nodes",
            },
          ],
          entryPoint: "builder.js",
        },
        downloads: 1095,
        rating: 4.3,
        reviews: 32,
        verified: false,
        category: ["Knowledge Management", "Visualization"],
        tags: ["knowledge-graph", "extraction", "visualization"],
      },
    ];

    mockAgents.forEach((agent) => {
      this.agents.set(agent.manifest.id, agent);
    });
  }

  /**
   * Search for agents
   */
  searchAgents(query: AgentSearchQuery): MarketplaceAgent[] {
    let results = Array.from(this.agents.values());

    // Filter by query string
    if (query.query) {
      const searchTerm = query.query.toLowerCase();
      results = results.filter(
        (agent) =>
          agent.manifest.name.toLowerCase().includes(searchTerm) ||
          agent.manifest.description.toLowerCase().includes(searchTerm) ||
          agent.tags.some((tag) => tag.toLowerCase().includes(searchTerm)),
      );
    }

    // Filter by category
    if (query.category) {
      results = results.filter((agent) =>
        agent.category.includes(query.category!),
      );
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter((agent) =>
        query.tags!.some((tag) => agent.tags.includes(tag)),
      );
    }

    // Filter by rating
    if (query.minRating) {
      results = results.filter((agent) => agent.rating >= query.minRating!);
    }

    // Filter by verified
    if (query.verified) {
      results = results.filter((agent) => agent.verified);
    }

    // Sort results
    switch (query.sortBy) {
      case "downloads":
        results.sort((a, b) => b.downloads - a.downloads);
        break;
      case "rating":
        results.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        // Would sort by publication date if available
        break;
      case "name":
        results.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
        break;
    }

    return results;
  }

  /**
   * Get agent details
   */
  getAgent(agentId: string): MarketplaceAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Install an agent from marketplace
   */
  async installAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in marketplace`);
    }

    // Install using plugin manager
    const success = await this.pluginManager.installPlugin(agent.manifest);

    if (success) {
      // Update download count
      agent.downloads++;
      this.agents.set(agentId, agent);
    }

    return success;
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories);
  }

  /**
   * Get popular agents
   */
  getPopularAgents(limit: number = 10): MarketplaceAgent[] {
    return Array.from(this.agents.values())
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  /**
   * Get top-rated agents
   */
  getTopRatedAgents(limit: number = 10): MarketplaceAgent[] {
    return Array.from(this.agents.values())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  /**
   * Get verified agents
   */
  getVerifiedAgents(): MarketplaceAgent[] {
    return Array.from(this.agents.values()).filter((agent) => agent.verified);
  }

  /**
   * Submit a new agent to marketplace
   */
  async submitAgent(agent: MarketplaceAgent): Promise<boolean> {
    try {
      // Validate agent
      if (!this.validateAgent(agent)) {
        throw new Error("Invalid agent data");
      }

      // Check for duplicates
      if (this.agents.has(agent.manifest.id)) {
        throw new Error(`Agent ${agent.manifest.id} already exists`);
      }

      // Add to marketplace
      this.agents.set(agent.manifest.id, {
        ...agent,
        downloads: 0,
        rating: 0,
        reviews: 0,
        verified: false,
      });

      console.log(`Agent ${agent.manifest.name} submitted to marketplace`);
      return true;
    } catch (error) {
      console.error("Failed to submit agent:", error);
      return false;
    }
  }

  /**
   * Validate agent data
   */
  private validateAgent(agent: MarketplaceAgent): boolean {
    return !!(
      agent.manifest &&
      agent.manifest.id &&
      agent.manifest.name &&
      agent.manifest.version &&
      agent.category &&
      agent.category.length > 0
    );
  }

  /**
   * Rate an agent
   */
  async rateAgent(agentId: string, rating: number): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Update rating (simplified)
    const totalRating = agent.rating * agent.reviews + rating;
    agent.reviews++;
    agent.rating = totalRating / agent.reviews;

    this.agents.set(agentId, agent);
    return true;
  }

  /**
   * Check if agent is installed
   */
  isInstalled(agentId: string): boolean {
    return this.pluginManager.getPlugin(agentId) !== undefined;
  }

  /**
   * Get installed agents
   */
  getInstalledAgents(): MarketplaceAgent[] {
    const installedPlugins = this.pluginManager.getInstalledPlugins();
    return installedPlugins
      .map((plugin) => this.agents.get(plugin.manifest.id))
      .filter((agent): agent is MarketplaceAgent => agent !== undefined);
  }
}

// Singleton instance
let marketplaceInstance: AgentMarketplace | null = null;

/**
 * Get marketplace singleton
 */
export function getAgentMarketplace(): AgentMarketplace {
  if (!marketplaceInstance) {
    marketplaceInstance = new AgentMarketplace();
  }
  return marketplaceInstance;
}
