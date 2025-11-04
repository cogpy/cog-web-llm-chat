/**
 * OpenCog Integration Module
 * Main entry point for OpenCog multi-agent system
 */

export * from "./types";
export * from "./atomese";
export * from "./metta";
export * from "./translator";
export * from "./cogserver";
export * from "./agents";
export * from "./orchestrator";

import { AgentOrchestrator } from "./orchestrator";
import {
  TranslationAgent,
  ReasoningAgent,
  KnowledgeAgent,
  PlanningAgent,
} from "./agents";
import { LanguageTranslator } from "./translator";
import { CogServerClient, MockCogServerClient } from "./cogserver";
import { CogServerConfig } from "./types";

/**
 * Initialize OpenCog system with default agents
 */
export function initializeOpenCog(
  cogServerConfig?: CogServerConfig,
  useMockServer: boolean = true,
): {
  orchestrator: AgentOrchestrator;
  translator: LanguageTranslator;
  cogServer: CogServerClient | MockCogServerClient;
} {
  // Create orchestrator
  const orchestrator = new AgentOrchestrator();

  // Create translator
  const translator = new LanguageTranslator();

  // Create CogServer client
  const cogServer = useMockServer
    ? new MockCogServerClient()
    : cogServerConfig
      ? new CogServerClient(cogServerConfig)
      : new MockCogServerClient();

  // Create and register agents
  const translationAgent = new TranslationAgent(translator);
  const reasoningAgent = new ReasoningAgent();
  const knowledgeAgent = new KnowledgeAgent(cogServer);
  const planningAgent = new PlanningAgent();

  orchestrator.registerAgent(translationAgent);
  orchestrator.registerAgent(reasoningAgent);
  orchestrator.registerAgent(knowledgeAgent);
  orchestrator.registerAgent(planningAgent);

  return {
    orchestrator,
    translator,
    cogServer,
  };
}
