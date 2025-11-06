# WebLLM Chat - Formal Specifications and Architecture Documentation

## Overview

This directory contains comprehensive technical architecture documentation and formal Z++ specifications for the WebLLM Chat system with OpenCog integration.

## Documentation Files

### Architecture Documentation

- **[architecture_overview.md](architecture_overview.md)** (15KB, 437 lines)
  - Complete system architecture with Mermaid diagrams
  - Component interaction patterns
  - Data flow architecture
  - Integration boundaries
  - Deployment architecture
  - Security and privacy architecture
  - Technology stack summary

### Z++ Formal Specifications

The formal specifications use Z++ notation to precisely define the system's data structures, state, operations, and integration contracts.

- **[data_model.zpp](data_model.zpp)** (23KB, 437 lines)
  - Base types and enumerations (15+ types)
  - Core data structures (ChatMessage, ChatSession, Template, etc.)
  - Configuration structures (ModelConfig, ConfigType)
  - OpenCog structures (Agent, Task, AtomNode, MeTTaExpression)
  - Complete invariants for all data entities

- **[system_state.zpp](system_state.zpp)** (28KB, 544 lines)
  - ChatStore state management
  - ConfigStore application configuration
  - OrchestrationState (multi-agent system)
  - AtomSpace knowledge graph state
  - Reasoning engine states (PLN, ECAN, MOSES)
  - Memory system state (short-term and long-term)
  - LLM client states (WebLLM, MLC-LLM)
  - Global SystemState with cross-cutting invariants

- **[operations.zpp](operations.zpp)** (46KB, 967 lines)
  - **Chat Session Operations**: Create, delete, send message, streaming, completion
  - **Configuration Operations**: Update model config, switch client, update theme
  - **Multi-Agent Operations**: Register/unregister agents, task management, messaging
  - **Knowledge Representation**: Add atoms, query AtomSpace, translate between formats
  - **Reasoning Operations**: PLN inference rules, ECAN attention allocation, MOSES evolution
  - **Memory Operations**: Store, consolidate, recall memories, record experiences
  - **LLM Client Operations**: Initialize, generate completions, abort generation

- **[integrations.zpp](integrations.zpp)** (32KB, 695 lines)
  - **WebLLM API Contracts**: Initialize engine, chat completions, abort generation
  - **MLC-LLM REST API**: List models, create completions (streaming/non-streaming)
  - **CogServer WebSocket**: Connect, execute commands, query AtomSpace
  - **Browser APIs**: IndexedDB (model storage), WebGPU (acceleration), LocalStorage (persistence), ServiceWorker (PWA)
  - Integration invariants and error recovery strategies

## Total Specifications

- **Total Size**: ~144KB of formal specifications and documentation
- **Total Lines**: ~2,643 lines of formal Z++ specifications + architecture diagrams
- **Coverage**: Complete backend/core logic specification

## Key Features

### Formal Rigor

- **Preconditions and Postconditions**: Every operation specifies required conditions before and after execution
- **State Invariants**: Global and local invariants ensure data consistency
- **Type Safety**: Strong typing with enumerated types and constraints
- **Error Handling**: Formal specification of error conditions and recovery strategies

### Modular Design

The specifications are organized into four logical modules:
1. **Data Model**: Foundation types and structures
2. **System State**: State management and invariants
3. **Operations**: State transitions and business logic
4. **Integrations**: External API contracts

### Grounded in Implementation

All specifications are derived from actual TypeScript implementations:
- Zustand stores (`app/store/`)
- OpenCog system (`app/opencog/`)
- LLM clients (`app/client/`)
- Reasoning engines (`app/opencog/reasoning/`)
- Memory systems (`app/opencog/memory/`)

## Architecture Highlights

### System Components

1. **Multi-Agent System**: Autonomous agents for translation, reasoning, knowledge management, and planning
2. **Knowledge Representation**: Hybrid system supporting natural language, Atomese, and MeTTa
3. **Reasoning Engines**: PLN (probabilistic logic), ECAN (attention), MOSES (evolution)
4. **Memory System**: Short-term and long-term memory with consolidation
5. **LLM Clients**: WebLLM (browser-native) and MLC-LLM (REST API)

### Integration Boundaries

- **Browser APIs**: WebGPU, IndexedDB, LocalStorage, ServiceWorker
- **External Services** (optional): MLC-LLM REST API, CogServer WebSocket
- **Privacy-First**: All core processing happens in-browser

## Diagram Categories

The architecture documentation includes 10+ Mermaid diagrams:

- System architecture overview
- Component class diagrams
- Multi-agent system architecture
- Data flow sequences
- LLM client architecture
- Knowledge representation flow
- Cognitive system architecture (PLN, ECAN, MOSES)
- Deployment architecture
- Integration boundaries
- Security and privacy architecture

## Usage

### For Developers

Use these specifications to:
- Understand system architecture and component interactions
- Verify implementation correctness against formal contracts
- Design new features with precise pre/postconditions
- Debug state management issues
- Ensure integration contracts are respected

### For Researchers

The formal specifications provide:
- Precise semantics for cognitive architectures
- Formal models of multi-agent coordination
- Integration of symbolic AI (OpenCog) with neural AI (LLMs)
- Memory and learning system specifications

### For Auditors

The specifications enable:
- Verification of system invariants
- Security analysis of integration boundaries
- Privacy guarantees (local-first processing)
- API contract validation

## Methodology

The specifications follow the agent instructions for formal methods and architecture documentation:

1. **Repository Analysis**: Technology stack detection and component identification
2. **Data Layer Formalization**: Translation of data models to Z++ schemas
3. **System State Formalization**: Global and local state with invariants
4. **Operations Formalization**: State transitions with pre/postconditions
5. **Integration Contracts**: External API specifications with error handling

## Related Documentation

- [OPENCOG_INTEGRATION.md](OPENCOG_INTEGRATION.md) - OpenCog system usage guide
- [OPENCOG_ADVANCED_FEATURES.md](OPENCOG_ADVANCED_FEATURES.md) - Advanced OpenCog features
- [OPENCOG_EXAMPLES.md](OPENCOG_EXAMPLES.md) - Usage examples
- [FUTURE_ENHANCEMENTS.md](FUTURE_ENHANCEMENTS.md) - Planned enhancements

## References

- **Z Notation**: Formal specification language for abstract data types
- **Z++**: Extension of Z notation for object-oriented specifications
- **OpenCog**: Cognitive architecture framework
- **WebLLM**: Browser-native LLM execution with WebGPU
- **MLC-LLM**: Machine Learning Compilation for LLMs

## License

Apache 2.0 - See [LICENSE](../LICENSE) in repository root.
