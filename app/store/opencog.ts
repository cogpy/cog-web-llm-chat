/**
 * OpenCog Store
 * State management for OpenCog multi-agent system
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreKey } from "../constant";
import {
  Agent,
  Task,
  AgentMessage,
  Format,
  TranslationRequest,
  TranslationResponse,
  CogServerConfig,
} from "../opencog/types";
import {
  initializeOpenCog,
  AgentOrchestrator,
  LanguageTranslator,
  CogServerClient,
  MockCogServerClient,
} from "../opencog";
import { PLNReasoner, ECANEngine, MOSESEngine } from "../opencog/reasoning";
import { PersistentMemory, AgentLearning } from "../opencog/memory";
import { AtomNode } from "../opencog/types";

interface OpenCogState {
  // System state
  initialized: boolean;
  orchestrator?: AgentOrchestrator;
  translator?: LanguageTranslator;
  cogServer?: CogServerClient | MockCogServerClient;

  // Reasoning engines
  plnReasoner?: PLNReasoner;
  ecanEngine?: ECANEngine;
  mosesEngine?: MOSESEngine;

  // Memory system
  memory?: PersistentMemory;
  agentLearning?: Map<string, AgentLearning>; // Agent ID -> Learning instance

  // UI state
  activeFormat: Format;
  showAgentPanel: boolean;
  showTranslationPanel: boolean;
  showVisualizationPanel: boolean;
  showPerformancePanel: boolean;
  cogServerConnected: boolean;

  // Data
  agents: Agent[];
  tasks: Task[];
  messageHistory: AgentMessage[];
  atomSpace: AtomNode[]; // Atoms for visualization

  // Performance metrics
  performanceMetrics: {
    reasoning: {
      plnInferences: number;
      averageConfidence: number;
      inferenceTime: number;
    };
    attention: {
      totalAtoms: number;
      focusedAtoms: number;
      averageSTI: number;
      totalSTI: number;
    };
    evolution: {
      generation: number;
      populationSize: number;
      bestFitness: number;
      averageFitness: number;
    };
    memory: {
      totalMemories: number;
      experienceCount: number;
      skillCount: number;
      averageImportance: number;
    };
    agents: {
      total: number;
      active: number;
      idle: number;
      error: number;
    };
  };

  // Configuration
  cogServerConfig?: CogServerConfig;
  useMockServer: boolean;

  // Actions
  initialize: () => Promise<void>;
  shutdown: () => void;
  setActiveFormat: (format: Format) => void;
  setShowAgentPanel: (show: boolean) => void;
  setShowTranslationPanel: (show: boolean) => void;
  setShowVisualizationPanel: (show: boolean) => void;
  setShowPerformancePanel: (show: boolean) => void;

  // Translation
  translate: (request: TranslationRequest) => Promise<TranslationResponse>;

  // Agent operations
  refreshAgents: () => void;
  refreshTasks: () => void;
  refreshMessages: () => void;
  sendMessageToAgent: (agentId: string, content: string) => Promise<void>;
  createTask: (description: string, capability?: string) => Promise<Task>;

  // Reasoning operations
  performPLNReasoning: (atoms: AtomNode[]) => Promise<AtomNode[]>;
  runECANAttention: (steps: number) => Promise<void>;
  evolveWithMOSES: (generations: number) => Promise<any>;
  refreshPerformanceMetrics: () => Promise<void>;

  // Memory operations
  storeMemory: (
    agentId: string,
    type: string,
    content: any,
    importance: number,
  ) => Promise<void>;
  queryMemory: (agentId: string, type?: string) => Promise<any[]>;

  // Visualization operations
  addAtom: (atom: AtomNode) => void;
  clearAtomSpace: () => void;

  // CogServer
  setCogServerConfig: (config: CogServerConfig) => void;
  connectToCogServer: () => Promise<void>;
  disconnectFromCogServer: () => void;
  executeCogServerCommand: (
    command: string,
    mode?: "atomese" | "metta" | "scheme",
  ) => Promise<any>;
}

export const useOpenCogStore = create<OpenCogState>()(
  persist(
    (set, get) => ({
      // Initial state
      initialized: false,
      activeFormat: Format.NATURAL_LANGUAGE,
      showAgentPanel: false,
      showTranslationPanel: false,
      showVisualizationPanel: false,
      showPerformancePanel: false,
      cogServerConnected: false,
      agents: [],
      tasks: [],
      messageHistory: [],
      atomSpace: [],
      agentLearning: new Map(),
      useMockServer: true,
      performanceMetrics: {
        reasoning: {
          plnInferences: 0,
          averageConfidence: 0,
          inferenceTime: 0,
        },
        attention: {
          totalAtoms: 0,
          focusedAtoms: 0,
          averageSTI: 0,
          totalSTI: 0,
        },
        evolution: {
          generation: 0,
          populationSize: 0,
          bestFitness: 0,
          averageFitness: 0,
        },
        memory: {
          totalMemories: 0,
          experienceCount: 0,
          skillCount: 0,
          averageImportance: 0,
        },
        agents: {
          total: 0,
          active: 0,
          idle: 0,
          error: 0,
        },
      },

      // Initialize OpenCog system
      initialize: async () => {
        const state = get();
        if (state.initialized) return;

        const { orchestrator, translator, cogServer } = initializeOpenCog(
          state.cogServerConfig,
          state.useMockServer,
        );

        // Initialize reasoning engines
        const plnReasoner = new PLNReasoner();
        const ecanEngine = new ECANEngine();
        const mosesEngine = new MOSESEngine();

        // Initialize memory system
        const memory = new PersistentMemory();
        await memory.initialize();

        set({
          initialized: true,
          orchestrator,
          translator,
          cogServer,
          plnReasoner,
          ecanEngine,
          mosesEngine,
          memory,
          cogServerConnected: state.useMockServer,
        });

        // Initial data refresh
        get().refreshAgents();
        get().refreshTasks();
        get().refreshMessages();
        await get().refreshPerformanceMetrics();
      },

      // Shutdown system
      shutdown: () => {
        const { orchestrator, cogServer, memory } = get();
        orchestrator?.shutdown();
        cogServer?.disconnect();
        memory?.close();

        set({
          initialized: false,
          orchestrator: undefined,
          translator: undefined,
          cogServer: undefined,
          plnReasoner: undefined,
          ecanEngine: undefined,
          mosesEngine: undefined,
          memory: undefined,
          agentLearning: new Map(),
          cogServerConnected: false,
          agents: [],
          tasks: [],
          messageHistory: [],
          atomSpace: [],
        });
      },

      // UI actions
      setActiveFormat: (format) => set({ activeFormat: format }),
      setShowAgentPanel: (show) => set({ showAgentPanel: show }),
      setShowTranslationPanel: (show) => set({ showTranslationPanel: show }),
      setShowVisualizationPanel: (show) =>
        set({ showVisualizationPanel: show }),
      setShowPerformancePanel: (show) => set({ showPerformancePanel: show }),

      // Translation
      translate: async (request) => {
        const { translator, initialized } = get();

        if (!initialized || !translator) {
          throw new Error("OpenCog system not initialized");
        }

        return translator.translate(request);
      },

      // Agent operations
      refreshAgents: () => {
        const { orchestrator } = get();
        if (orchestrator) {
          const agents = orchestrator.getAgents();
          set({ agents });
        }
      },

      refreshTasks: () => {
        const { orchestrator } = get();
        if (orchestrator) {
          const tasks = orchestrator.getTasks();
          set({ tasks });
        }
      },

      refreshMessages: () => {
        const { orchestrator } = get();
        if (orchestrator) {
          const messageHistory = orchestrator.getMessageHistory(100);
          set({ messageHistory });
        }
      },

      sendMessageToAgent: async (agentId, content) => {
        const { orchestrator, initialized } = get();

        if (!initialized || !orchestrator) {
          throw new Error("OpenCog system not initialized");
        }

        await orchestrator.sendToAgent(agentId, content);
        get().refreshMessages();
      },

      createTask: async (description, capability) => {
        const { orchestrator, initialized } = get();

        if (!initialized || !orchestrator) {
          throw new Error("OpenCog system not initialized");
        }

        const task = await orchestrator.createTask(description, capability);
        get().refreshTasks();
        return task;
      },

      // CogServer operations
      setCogServerConfig: (config) => {
        set({ cogServerConfig: config, useMockServer: false });
      },

      connectToCogServer: async () => {
        const { cogServer, cogServerConfig, useMockServer } = get();

        if (!cogServerConfig) {
          throw new Error("CogServer configuration not set");
        }

        // Check if we need to create a real client (currently using mock)
        if (useMockServer && cogServer) {
          // Need to create real client
          const realServer = new CogServerClient(cogServerConfig);
          await realServer.connect();
          set({
            cogServer: realServer,
            cogServerConnected: true,
            useMockServer: false,
          });
        } else if (cogServer) {
          await cogServer.connect();
          set({ cogServerConnected: true });
        }
      },

      disconnectFromCogServer: () => {
        const { cogServer } = get();
        cogServer?.disconnect();
        set({ cogServerConnected: false });
      },

      executeCogServerCommand: async (command, mode = "atomese") => {
        const { cogServer, cogServerConnected } = get();

        if (!cogServerConnected || !cogServer) {
          throw new Error("Not connected to CogServer");
        }

        if (mode === "atomese") {
          return cogServer.executeAtomese(command);
        } else if (mode === "metta") {
          return cogServer.executeMetta(command);
        } else {
          return cogServer.executeScheme(command);
        }
      },

      // Reasoning operations
      performPLNReasoning: async (atoms: AtomNode[]) => {
        const { plnReasoner } = get();
        if (!plnReasoner) {
          throw new Error("PLN reasoner not initialized");
        }

        const startTime = performance.now();
        const result = await plnReasoner.reason(atoms);
        const endTime = performance.now();

        // Update metrics
        set((state) => ({
          performanceMetrics: {
            ...state.performanceMetrics,
            reasoning: {
              plnInferences:
                state.performanceMetrics.reasoning.plnInferences +
                result.derived.length,
              averageConfidence: result.confidence,
              inferenceTime: endTime - startTime,
            },
          },
        }));

        return result.derived;
      },

      runECANAttention: async (steps: number = 10) => {
        const { ecanEngine } = get();
        if (!ecanEngine) {
          throw new Error("ECAN engine not initialized");
        }

        for (let i = 0; i < steps; i++) {
          ecanEngine.spreadAttention();
        }

        await get().refreshPerformanceMetrics();
      },

      evolveWithMOSES: async (generations: number = 10) => {
        const { mosesEngine } = get();
        if (!mosesEngine) {
          throw new Error("MOSES engine not initialized");
        }

        const result = await mosesEngine.evolve(generations);
        await get().refreshPerformanceMetrics();
        return result;
      },

      refreshPerformanceMetrics: async () => {
        const { plnReasoner, ecanEngine, mosesEngine, memory, agents } = get();

        // ECAN metrics
        let ecanStats = {
          totalAtoms: 0,
          focusedAtoms: 0,
          averageSTI: 0,
          totalSTI: 0,
        };

        if (ecanEngine) {
          const stats = ecanEngine.getStatistics();
          ecanStats = {
            totalAtoms: stats.totalAtoms,
            focusedAtoms: stats.focusedAtoms,
            averageSTI: stats.averageSTI,
            totalSTI: stats.totalSTI,
          };
        }

        // MOSES metrics
        let mosesStats = {
          generation: 0,
          populationSize: 0,
          bestFitness: 0,
          averageFitness: 0,
        };

        if (mosesEngine) {
          const stats = mosesEngine.getStatistics();
          mosesStats = {
            generation: stats.generation,
            populationSize: stats.populationSize,
            bestFitness: stats.bestFitness,
            averageFitness: stats.averageFitness,
          };
        }

        // Memory metrics
        let memoryStats = {
          totalMemories: 0,
          experienceCount: 0,
          skillCount: 0,
          averageImportance: 0,
        };

        if (memory) {
          const stats = await memory.getStatistics();
          memoryStats = {
            totalMemories: stats.totalMemories,
            experienceCount: stats.byType.experience || 0,
            skillCount: stats.byType.skill || 0,
            averageImportance: stats.averageImportance,
          };
        }

        // Agent metrics
        const agentStats = {
          total: agents.length,
          active: agents.filter((a) => a.status === "busy").length,
          idle: agents.filter((a) => a.status === "idle").length,
          error: agents.filter((a) => a.status === "error").length,
        };

        set((state) => ({
          performanceMetrics: {
            reasoning: state.performanceMetrics.reasoning,
            attention: ecanStats,
            evolution: mosesStats,
            memory: memoryStats,
            agents: agentStats,
          },
        }));
      },

      // Memory operations
      storeMemory: async (
        agentId: string,
        type: string,
        content: any,
        importance: number,
      ) => {
        const { memory } = get();
        if (!memory) {
          throw new Error("Memory system not initialized");
        }

        await memory.store({
          agentId,
          type: type as any,
          content,
          importance,
          timestamp: Date.now(),
          accessCount: 0,
          lastAccessed: Date.now(),
        });

        await get().refreshPerformanceMetrics();
      },

      queryMemory: async (agentId: string, type?: string) => {
        const { memory } = get();
        if (!memory) {
          throw new Error("Memory system not initialized");
        }

        const results = await memory.query({
          agentId,
          type: type as any,
        });

        return results;
      },

      // Visualization operations
      addAtom: (atom: AtomNode) => {
        set((state) => ({
          atomSpace: [...state.atomSpace, atom],
        }));

        // Also add to ECAN engine
        const { ecanEngine } = get();
        if (ecanEngine) {
          ecanEngine.addAtom(atom.name || `atom_${Date.now()}`, atom);
        }
      },

      clearAtomSpace: () => {
        set({ atomSpace: [] });

        const { ecanEngine } = get();
        if (ecanEngine) {
          ecanEngine.clear();
        }
      },
    }),
    {
      name: StoreKey.OpenCog,
      version: 1,
      // Only persist configuration, not runtime state
      partialize: (state) => ({
        activeFormat: state.activeFormat,
        showAgentPanel: state.showAgentPanel,
        showTranslationPanel: state.showTranslationPanel,
        cogServerConfig: state.cogServerConfig,
        useMockServer: state.useMockServer,
      }),
    },
  ),
);
