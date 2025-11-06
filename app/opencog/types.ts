/**
 * OpenCog Integration Types
 * Type definitions for multi-agent orchestration and Atomese/MeTTa support
 */

// Agent Types
export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  capabilities: string[];
  context?: Record<string, any>;
}

export enum AgentStatus {
  IDLE = "idle",
  BUSY = "busy",
  ERROR = "error",
  OFFLINE = "offline",
}

export interface AgentMessage {
  id: string;
  senderId: string;
  receiverId?: string; // undefined means broadcast
  content: string;
  timestamp: number;
  type: MessageType;
  metadata?: Record<string, any>;
}

export enum MessageType {
  TASK = "task",
  RESPONSE = "response",
  QUERY = "query",
  BROADCAST = "broadcast",
  COMMAND = "command",
}

// Atomese Types
export interface AtomNode {
  type: AtomType;
  name?: string;
  value?: any;
  children?: AtomNode[];
  truthValue?: TruthValue;
}

export enum AtomType {
  CONCEPT_NODE = "ConceptNode",
  PREDICATE_NODE = "PredicateNode",
  VARIABLE_NODE = "VariableNode",
  LIST_LINK = "ListLink",
  INHERITANCE_LINK = "InheritanceLink",
  SIMILARITY_LINK = "SimilarityLink",
  EVALUATION_LINK = "EvaluationLink",
  IMPLICATION_LINK = "ImplicationLink",
  AND_LINK = "AndLink",
  OR_LINK = "OrLink",
  NOT_LINK = "NotLink",
}

export interface TruthValue {
  strength: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
}

// MeTTa Types
export interface MeTTaExpression {
  type: "atom" | "expression" | "variable";
  value: string | MeTTaExpression[];
  metadata?: Record<string, any>;
}

// CogServer Types
export interface CogServerConfig {
  host: string;
  port: number;
  protocol: "ws" | "tcp";
  reconnect: boolean;
  reconnectInterval?: number;
}

export interface CogServerCommand {
  command: string;
  args?: string[];
  mode?: "atomese" | "metta" | "scheme";
}

export interface CogServerResponse {
  success: boolean;
  result?: any;
  error?: string;
  timestamp: number;
}

// Translation Types
export interface TranslationRequest {
  input: string;
  sourceFormat: Format;
  targetFormat: Format;
  context?: string;
}

export interface TranslationResponse {
  output: string;
  sourceFormat: Format;
  targetFormat: Format;
  confidence?: number;
  explanation?: string;
}

export enum Format {
  NATURAL_LANGUAGE = "natural_language",
  ATOMESE = "atomese",
  METTA = "metta",
  SCHEME = "scheme",
}

// Orchestration Types
export interface Task {
  id: string;
  description: string;
  assignedTo?: string; // agent id
  status: TaskStatus;
  priority: number;
  dependencies?: string[]; // task ids
  result?: any;
  createdAt: number;
  updatedAt: number;
}

export enum TaskStatus {
  PENDING = "pending",
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface OrchestrationState {
  agents: Map<string, Agent>;
  tasks: Map<string, Task>;
  messageQueue: AgentMessage[];
  activeSession?: string;
}
