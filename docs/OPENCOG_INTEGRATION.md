# OpenCog Integration Documentation

## Overview

This integration implements OpenCog as an autonomous multi-agent orchestration system with web-llm-chat assistant integration. It provides a natural language interface to OpenCog's knowledge representation languages (Atomese and MeTTa) through CogServer.

## Architecture

### Components

#### 1. Multi-Agent System (`app/opencog/agents.ts`)

The system includes four specialized autonomous agents:

- **TranslationAgent**: Translates between natural language, Atomese, and MeTTa
- **ReasoningAgent**: Performs logical inference and pattern matching
- **KnowledgeAgent**: Manages AtomSpace queries and knowledge operations
- **PlanningAgent**: Decomposes complex tasks into subtasks

Each agent extends the `BaseAgent` class and can:
- Receive and process messages
- Handle tasks asynchronously
- Communicate with other agents
- Report status (IDLE, BUSY, ERROR, OFFLINE)

#### 2. Agent Orchestrator (`app/opencog/orchestrator.ts`)

The orchestrator manages the entire multi-agent system:
- Registers and unregisters agents
- Creates and assigns tasks
- Routes messages between agents
- Maintains system state
- Broadcasts to all agents

#### 3. Language Support

**Atomese Parser/Generator** (`app/opencog/atomese.ts`):
- Parses Atomese S-expressions into structured data
- Generates Atomese from structured data
- Validates Atomese syntax
- Supports common atom types: ConceptNode, PredicateNode, InheritanceLink, EvaluationLink, etc.

**MeTTa Parser/Generator** (`app/opencog/metta.ts`):
- Parses MeTTa expressions
- Generates MeTTa code
- Validates MeTTa syntax
- Provides helper functions for common patterns (type declarations, function definitions, etc.)

#### 4. Language Translator (`app/opencog/translator.ts`)

Bidirectional translation between:
- Natural Language ↔ Atomese
- Natural Language ↔ MeTTa
- Atomese ↔ MeTTa

Uses LLM for natural language translations and rule-based conversion for formal languages.

#### 5. CogServer Client (`app/opencog/cogserver.ts`)

WebSocket-based client for connecting to OpenCog CogServer:
- Execute Atomese, MeTTa, and Scheme commands
- Query the AtomSpace
- Auto-reconnection support
- Mock client for testing without CogServer

#### 6. UI Components

**Agent Panel** (`app/components/opencog/agent-panel.tsx`):
- Displays all registered agents
- Shows agent status (idle, busy, error, offline)
- Lists agent capabilities
- Updates in real-time

**Translation Panel** (`app/components/opencog/translation-panel.tsx`):
- Interactive translation interface
- Format selection (Natural Language, Atomese, MeTTa, Scheme)
- Swap button for reversing translation direction
- Monospace font for code formats

## Usage

### Starting the OpenCog System

The system initializes automatically when you open the Agent or Translation panels. Alternatively:

```typescript
import { useOpenCogStore } from './store/opencog';

const openCogStore = useOpenCogStore();
openCogStore.initialize();
```

### Accessing Panels

Click the buttons in the sidebar:
- **Agents**: Opens the Agent Panel showing all autonomous agents
- **Translator**: Opens the Translation Panel for language conversion

### Translation Examples

**Natural Language to Atomese**:
```
Input: "Cats are animals"
Output: (InheritanceLink (ConceptNode "cat") (ConceptNode "animal"))
```

**Natural Language to MeTTa**:
```
Input: "Define a human type"
Output: (: Human Type)
```

**Atomese to MeTTa**:
```
Input: (InheritanceLink (ConceptNode "Socrates") (ConceptNode "mortal"))
Output: (: Socrates mortal)
```

### Using Agents Programmatically

```typescript
const openCogStore = useOpenCogStore();

// Create a task for translation
const task = await openCogStore.createTask(
  "Translate 'All humans are mortal' to Atomese",
  "nl-to-atomese"
);

// Send a message to a specific agent
await openCogStore.sendMessageToAgent(agentId, "query about logic");
```

### Connecting to CogServer

```typescript
const openCogStore = useOpenCogStore();

// Configure CogServer connection
openCogStore.setCogServerConfig({
  host: "localhost",
  port: 17001,
  protocol: "ws",
  reconnect: true,
});

// Connect
await openCogStore.connectToCogServer();

// Execute commands
const result = await openCogStore.executeCogServerCommand(
  "(ConceptNode \"test\")",
  "atomese"
);
```

## API Reference

### Types

#### Agent
```typescript
interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  capabilities: string[];
  context?: Record<string, any>;
}
```

#### Task
```typescript
interface Task {
  id: string;
  description: string;
  assignedTo?: string;
  status: TaskStatus;
  priority: number;
  dependencies?: string[];
  result?: any;
  createdAt: number;
  updatedAt: number;
}
```

#### TranslationRequest
```typescript
interface TranslationRequest {
  input: string;
  sourceFormat: Format; // "natural_language" | "atomese" | "metta" | "scheme"
  targetFormat: Format;
  context?: string;
}
```

### Store Methods

- `initialize()`: Initialize the OpenCog system
- `shutdown()`: Shutdown all agents
- `translate(request: TranslationRequest)`: Translate between formats
- `createTask(description, capability?)`: Create a new task
- `sendMessageToAgent(agentId, content)`: Send message to agent
- `connectToCogServer()`: Connect to CogServer
- `executeCogServerCommand(command, mode)`: Execute CogServer command

## Atomese Examples

### Concept Definition
```scheme
(ConceptNode "cat")
```

### Inheritance Relationship
```scheme
(InheritanceLink
  (ConceptNode "cat")
  (ConceptNode "animal"))
```

### Predicate Evaluation
```scheme
(EvaluationLink
  (PredicateNode "likes")
  (ListLink
    (ConceptNode "Alice")
    (ConceptNode "pizza")))
```

### Logical Implication
```scheme
(ImplicationLink
  (ConceptNode "human")
  (ConceptNode "mortal"))
```

## MeTTa Examples

### Type Declaration
```metta
(: Human Type)
```

### Function Definition
```metta
(= (fib 0) 1)
(= (fib 1) 1)
(= (fib $n) (+ (fib (- $n 1)) (fib (- $n 2))))
```

### Arrow Type
```metta
(-> Person (knows Person))
```

### Match Expression
```metta
(match $x
  (Pattern)
  (Result))
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Web UI Layer                         │
│  ┌──────────────┐              ┌──────────────┐         │
│  │ Agent Panel  │              │ Translation  │         │
│  │              │              │    Panel     │         │
│  └──────────────┘              └──────────────┘         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  OpenCog Store (Zustand)                 │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Agent Orchestrator                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │Translation│ │Reasoning │  │Knowledge │  │Planning ││
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent  ││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
└─────────────────────────────────────────────────────────┘
         │                                       │
         ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│   Translator     │                  │  CogServer       │
│  (NL ↔ Formal)   │                  │    Client        │
└──────────────────┘                  └──────────────────┘
         │                                       │
         ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│ Atomese Parser   │                  │   CogServer      │
│ MeTTa Parser     │                  │   (External)     │
└──────────────────┘                  └──────────────────┘
```

## Development

### Adding a New Agent

1. Create a new class extending `BaseAgent`:

```typescript
export class MyCustomAgent extends BaseAgent {
  constructor() {
    super("MyAgent", "custom-role", ["capability1", "capability2"]);
  }

  protected async processTask(task: string, metadata?: Record<string, any>): Promise<string> {
    // Implement task processing
    return "result";
  }

  protected async answerQuery(query: string, metadata?: Record<string, any>): Promise<string> {
    // Implement query answering
    return "answer";
  }
}
```

2. Register it in the orchestrator:

```typescript
const myAgent = new MyCustomAgent();
orchestrator.registerAgent(myAgent);
```

### Extending Language Support

To add support for additional formats:

1. Add the format to `Format` enum in `types.ts`
2. Implement parser/generator in a new file
3. Update translator to handle the new format
4. Add format option to UI

## Future Enhancements

### Recently Implemented ✅

- [x] **Advanced Reasoning Algorithms**
  - PLN (Probabilistic Logic Networks) with deduction, induction, abduction
  - ECAN (Economic Attention Allocation) with STI/LTI importance spreading
  - MOSES (Meta-Optimizing Semantic Evolutionary Search) genetic programming
  
- [x] **Agent Learning and Adaptation**
  - Experience-based learning with strategy formation
  - Epsilon-greedy action selection
  - Performance monitoring and adaptation
  
- [x] **Persistent Agent Memory**
  - IndexedDB-based browser storage
  - Memory types: experience, knowledge, skill, context
  - Query system with filtering and consolidation
  
- [x] **Performance Monitoring Dashboard**
  - Real-time metrics for PLN, ECAN, MOSES
  - Agent status monitoring
  - Memory statistics
  - Historical trend visualization
  
- [x] **Real-time AtomSpace Visualization**
  - Interactive graph visualization
  - Force-directed layout
  - Atom selection and details
  
- [x] **Advanced Query Builder**
  - Visual query interface
  - Multiple filter criteria (type, name, truth values)
  - Pattern matching system
  - AND/OR combination modes
  
- [x] **Knowledge Base Export/Import**
  - Export to JSON, Atomese (.scm), MeTTa (.metta)
  - Import with auto-format detection
  - File upload/download
  - KB merging with deduplication

### Planned Future Enhancements

- [ ] **Integration with actual OpenCog Hyperon**
  - FFI bindings to Hyperon core
  - Native MeTTa execution
  - Hyperon AtomSpace synchronization
  
- [ ] **Visual Programming Interface**
  - Drag-and-drop knowledge graph editor
  - Interactive atom creation
  - Visual link editing
  - Constraint-based layout
  
- [ ] **Multi-user Collaboration**
  - WebSocket-based real-time sync
  - Conflict resolution strategies
  - User presence indicators
  - Collaborative editing
  
- [ ] **Agent Marketplace/Plugins**
  - Plugin system architecture
  - Agent discovery and installation
  - Sandboxed execution environment
  - Capability-based security

## Contributing

When contributing to the OpenCog integration:

1. Follow the existing code style
2. Add types for all new functionality
3. Update this documentation
4. Test with both mock and real CogServer (if available)
5. Ensure UI components are accessible and responsive

## License

Apache-2.0 (same as the parent project)
