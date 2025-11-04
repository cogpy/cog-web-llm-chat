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

interface OpenCogState {
  // System state
  initialized: boolean;
  orchestrator?: AgentOrchestrator;
  translator?: LanguageTranslator;
  cogServer?: CogServerClient | MockCogServerClient;

  // UI state
  activeFormat: Format;
  showAgentPanel: boolean;
  showTranslationPanel: boolean;
  cogServerConnected: boolean;

  // Data
  agents: Agent[];
  tasks: Task[];
  messageHistory: AgentMessage[];

  // Configuration
  cogServerConfig?: CogServerConfig;
  useMockServer: boolean;

  // Actions
  initialize: () => void;
  shutdown: () => void;
  setActiveFormat: (format: Format) => void;
  setShowAgentPanel: (show: boolean) => void;
  setShowTranslationPanel: (show: boolean) => void;

  // Translation
  translate: (request: TranslationRequest) => Promise<TranslationResponse>;

  // Agent operations
  refreshAgents: () => void;
  refreshTasks: () => void;
  refreshMessages: () => void;
  sendMessageToAgent: (agentId: string, content: string) => Promise<void>;
  createTask: (description: string, capability?: string) => Promise<Task>;

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
      cogServerConnected: false,
      agents: [],
      tasks: [],
      messageHistory: [],
      useMockServer: true,

      // Initialize OpenCog system
      initialize: () => {
        const state = get();
        if (state.initialized) return;

        const { orchestrator, translator, cogServer } = initializeOpenCog(
          state.cogServerConfig,
          state.useMockServer,
        );

        set({
          initialized: true,
          orchestrator,
          translator,
          cogServer,
          cogServerConnected: state.useMockServer,
        });

        // Initial data refresh
        get().refreshAgents();
        get().refreshTasks();
        get().refreshMessages();
      },

      // Shutdown system
      shutdown: () => {
        const { orchestrator, cogServer } = get();
        orchestrator?.shutdown();
        cogServer?.disconnect();

        set({
          initialized: false,
          orchestrator: undefined,
          translator: undefined,
          cogServer: undefined,
          cogServerConnected: false,
          agents: [],
          tasks: [],
          messageHistory: [],
        });
      },

      // UI actions
      setActiveFormat: (format) => set({ activeFormat: format }),
      setShowAgentPanel: (show) => set({ showAgentPanel: show }),
      setShowTranslationPanel: (show) => set({ showTranslationPanel: show }),

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
        const { cogServer, cogServerConfig } = get();

        if (!cogServerConfig) {
          throw new Error("CogServer configuration not set");
        }

        if (cogServer && cogServer instanceof MockCogServerClient) {
          // Need to create real client
          const realServer = new CogServerClient(cogServerConfig);
          await realServer.connect();
          set({ cogServer: realServer, cogServerConnected: true });
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
