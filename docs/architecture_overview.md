# WebLLM Chat - Technical Architecture Documentation

## Executive Summary

WebLLM Chat is a browser-native AI chat application that combines WebLLM (in-browser LLM execution) with OpenCog's multi-agent orchestration system. The system enables private, offline-capable AI conversations with advanced cognitive capabilities through formal knowledge representation (Atomese and MeTTa).

**Key Architectural Characteristics:**
- **Client-side Architecture**: All processing occurs in the browser using WebGPU
- **Multi-Agent System**: Autonomous agents for translation, reasoning, knowledge management, and planning
- **Hybrid Knowledge Representation**: Natural language + formal languages (Atomese/MeTTa)
- **State Management**: Zustand-based reactive stores with persistence
- **Modular Design**: Clear separation between LLM clients, cognitive systems, and UI

## System Architecture Overview

```mermaid
graph TB
    subgraph "Browser Environment"
        subgraph "Presentation Layer"
            UI[React UI Components]
            Chat[Chat Interface]
            AgentPanel[Agent Panel]
            TransPanel[Translation Panel]
            Viz[Visualization Components]
        end
        
        subgraph "State Management Layer"
            ChatStore[Chat Store<br/>Zustand]
            ConfigStore[Config Store<br/>Zustand]
            OpenCogStore[OpenCog Store<br/>Zustand]
        end
        
        subgraph "Core Logic Layer"
            subgraph "LLM Clients"
                WebLLM[WebLLM Client<br/>WebGPU]
                MLCAPI[MLC-LLM API Client]
            end
            
            subgraph "OpenCog System"
                Orchestrator[Agent Orchestrator]
                Agents[Multi-Agent System]
                Translator[Language Translator]
                CogClient[CogServer Client]
            end
            
            subgraph "Cognitive Subsystems"
                PLN[PLN Reasoner]
                ECAN[ECAN Attention]
                MOSES[MOSES Evolution]
                Memory[Persistent Memory]
                Learning[Agent Learning]
            end
        end
        
        subgraph "Data Layer"
            IndexedDB[(IndexedDB<br/>Model Cache)]
            LocalStorage[(LocalStorage<br/>State Persistence)]
        end
    end
    
    subgraph "External Services"
        MLCServer[MLC-LLM REST API<br/>Optional]
        CogServer[CogServer<br/>Optional]
    end
    
    UI --> ChatStore
    UI --> ConfigStore
    UI --> OpenCogStore
    
    ChatStore --> WebLLM
    ChatStore --> MLCAPI
    
    OpenCogStore --> Orchestrator
    OpenCogStore --> Translator
    OpenCogStore --> CogClient
    
    Orchestrator --> Agents
    Agents --> PLN
    Agents --> ECAN
    Agents --> MOSES
    Agents --> Memory
    Agents --> Learning
    
    WebLLM --> IndexedDB
    ChatStore --> LocalStorage
    ConfigStore --> LocalStorage
    OpenCogStore --> LocalStorage
    
    MLCAPI -.-> MLCServer
    CogClient -.-> CogServer
    
    style WebLLM fill:#e1f5ff
    style Orchestrator fill:#fff4e1
    style PLN fill:#ffe1e1
    style ECAN fill:#ffe1e1
    style MOSES fill:#ffe1e1
```

## Component Architecture

### 1. State Management Layer

```mermaid
classDiagram
    class ChatStore {
        +sessions: ChatSession[]
        +currentSessionIndex: number
        +onNewMessage(message)
        +updateCurrentSession(update)
        +deleteSession(id)
        +clearAllData()
    }
    
    class ConfigStore {
        +modelConfig: ModelConfig
        +theme: Theme
        +modelClientType: ModelClient
        +submitKey: SubmitKey
        +update(config)
    }
    
    class OpenCogStore {
        +orchestrator: AgentOrchestrator
        +agents: Agent[]
        +tasks: Task[]
        +messageHistory: AgentMessage[]
        +performanceMetrics: Metrics
        +initialize()
        +translate(request)
        +assignTask(taskId, agentId)
    }
    
    class ChatSession {
        +id: string
        +topic: string
        +messages: ChatMessage[]
        +stat: ChatStat
        +isGenerating: boolean
        +template: Template
    }
    
    class ChatMessage {
        +id: string
        +role: MessageRole
        +content: string|MultimodalContent[]
        +date: string
        +model: Model
        +usage: CompletionUsage
    }
    
    ChatStore --> ChatSession
    ChatSession --> ChatMessage
```

### 2. Multi-Agent System Architecture

```mermaid
graph TB
    subgraph "Agent Orchestrator"
        Registry[Agent Registry]
        TaskQueue[Task Queue]
        MessageRouter[Message Router]
    end
    
    subgraph "Autonomous Agents"
        TransAgent[Translation Agent<br/>NL↔Atomese↔MeTTa]
        ReasonAgent[Reasoning Agent<br/>PLN Inference]
        KnowAgent[Knowledge Agent<br/>AtomSpace Queries]
        PlanAgent[Planning Agent<br/>Task Decomposition]
    end
    
    subgraph "Agent Capabilities"
        direction LR
        TransCap[translate_nl<br/>translate_atomese<br/>translate_metta]
        ReasonCap[reason_pln<br/>pattern_match<br/>infer]
        KnowCap[query_atomspace<br/>store_knowledge<br/>retrieve_facts]
        PlanCap[decompose_task<br/>plan_execution<br/>coordinate]
    end
    
    Registry --> TransAgent
    Registry --> ReasonAgent
    Registry --> KnowAgent
    Registry --> PlanAgent
    
    TransAgent --> TransCap
    ReasonAgent --> ReasonCap
    KnowAgent --> KnowCap
    PlanAgent --> PlanCap
    
    TaskQueue --> MessageRouter
    MessageRouter --> TransAgent
    MessageRouter --> ReasonAgent
    MessageRouter --> KnowAgent
    MessageRouter --> PlanAgent
    
    style TransAgent fill:#e1f5ff
    style ReasonAgent fill:#ffe1e1
    style KnowAgent fill:#e1ffe1
    style PlanAgent fill:#fff4e1
```

### 3. Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant ChatStore
    participant WebLLM
    participant Orchestrator
    participant Agent
    participant Translator
    
    User->>UI: Send Message
    UI->>ChatStore: onUserInput(message)
    ChatStore->>WebLLM: chat(options)
    
    alt OpenCog Task Detected
        ChatStore->>Orchestrator: createTask(description)
        Orchestrator->>Agent: assignTask(task)
        Agent->>Translator: translate(request)
        Translator-->>Agent: translation result
        Agent-->>Orchestrator: task completed
        Orchestrator-->>ChatStore: result
    end
    
    WebLLM->>WebLLM: Execute LLM (WebGPU)
    
    loop Streaming Response
        WebLLM-->>ChatStore: onUpdate(chunk)
        ChatStore-->>UI: Update Message
        UI-->>User: Display Chunk
    end
    
    WebLLM-->>ChatStore: onFinish(message, usage)
    ChatStore->>ChatStore: Update Session
    ChatStore-->>UI: Final Update
```

### 4. LLM Client Architecture

```mermaid
graph TB
    subgraph "LLM Client Abstraction"
        API[LLMApi Interface<br/>chat, abort, models]
    end
    
    subgraph "WebLLM Implementation"
        WebLLMClient[WebLLM Client]
        ServiceWorker[ServiceWorker Engine]
        WebWorker[WebWorker Engine]
        WebGPU[WebGPU Runtime]
        ModelCache[IndexedDB Cache]
    end
    
    subgraph "MLC-LLM Implementation"
        MLCClient[MLC-LLM Client]
        RESTClient[REST API Client]
        ExternalServer[External Server]
    end
    
    API --> WebLLMClient
    API --> MLCClient
    
    WebLLMClient --> ServiceWorker
    WebLLMClient --> WebWorker
    ServiceWorker --> WebGPU
    WebWorker --> WebGPU
    WebGPU --> ModelCache
    
    MLCClient --> RESTClient
    RESTClient --> ExternalServer
    
    style WebLLMClient fill:#e1f5ff
    style MLCClient fill:#ffe1e1
```

## Integration Boundaries

```mermaid
graph LR
    subgraph "Internal System"
        Core[Core Application]
        Stores[State Stores]
        Agents[Agent System]
    end
    
    subgraph "Browser APIs"
        WebGPU[WebGPU API]
        IndexedDB[IndexedDB API]
        WebWorkers[Web Workers API]
        ServiceWorker[Service Worker API]
    end
    
    subgraph "External Services (Optional)"
        MLCServer[MLC-LLM REST API]
        CogServer[CogServer WebSocket]
    end
    
    Core --> WebGPU
    Core --> IndexedDB
    Core --> WebWorkers
    Core --> ServiceWorker
    
    Core -.->|HTTP/REST| MLCServer
    Agents -.->|WebSocket| CogServer
    
    style Core fill:#e1f5ff
    style WebGPU fill:#fff4e1
    style MLCServer fill:#ffe1e1
    style CogServer fill:#ffe1e1
```

## Knowledge Representation Flow

```mermaid
graph TB
    subgraph "Input Processing"
        NL[Natural Language Input]
        Detect[Language Detection]
    end
    
    subgraph "Translation Layer"
        NL2Atomese[NL → Atomese]
        NL2MeTTa[NL → MeTTa]
        Atomese2MeTTa[Atomese → MeTTa]
        MeTTa2Atomese[MeTTa → Atomese]
    end
    
    subgraph "Knowledge Processing"
        AtomSpace[AtomSpace<br/>Knowledge Base]
        PLNEngine[PLN Reasoning]
        MeTTaRuntime[MeTTa Runtime]
    end
    
    subgraph "Output Generation"
        Result2NL[Formal → NL]
        Output[Natural Language Output]
    end
    
    NL --> Detect
    
    Detect -->|Atomese Detected| Atomese2MeTTa
    Detect -->|MeTTa Detected| MeTTa2Atomese
    Detect -->|NL Detected| NL2Atomese
    Detect -->|NL Detected| NL2MeTTa
    
    NL2Atomese --> AtomSpace
    Atomese2MeTTa --> MeTTaRuntime
    MeTTa2Atomese --> AtomSpace
    
    AtomSpace --> PLNEngine
    PLNEngine --> Result2NL
    MeTTaRuntime --> Result2NL
    
    Result2NL --> Output
```

## Cognitive System Architecture

```mermaid
graph TB
    subgraph "Attention Allocation (ECAN)"
        STI[Short-Term Importance]
        LTI[Long-Term Importance]
        Forgetting[Forgetting Mechanism]
        HebbianLinks[Hebbian Link Creation]
    end
    
    subgraph "Reasoning (PLN)"
        Deduction[Deduction Rule]
        Induction[Induction Rule]
        Abduction[Abduction Rule]
        Bayes[Bayesian Inference]
        TruthValues[Truth Value Revision]
    end
    
    subgraph "Evolution (MOSES)"
        Population[Candidate Population]
        Fitness[Fitness Evaluation]
        Crossover[Crossover Operations]
        Mutation[Mutation Operations]
        Selection[Selection & Elitism]
    end
    
    subgraph "Memory System"
        STM[Short-Term Memory]
        LTM[Long-Term Memory]
        Episodic[Episodic Memory]
        Procedural[Procedural Memory]
    end
    
    subgraph "Learning System"
        Experiences[Experience Buffer]
        PatternExtract[Pattern Extraction]
        SkillAcquisition[Skill Acquisition]
        PolicyUpdate[Policy Updates]
    end
    
    STI --> Forgetting
    LTI --> STM
    Forgetting --> LTM
    HebbianLinks --> STI
    
    Deduction --> TruthValues
    Induction --> TruthValues
    Abduction --> TruthValues
    Bayes --> TruthValues
    
    Population --> Fitness
    Fitness --> Selection
    Selection --> Crossover
    Selection --> Mutation
    Crossover --> Population
    Mutation --> Population
    
    STM --> Episodic
    LTM --> Procedural
    
    Experiences --> PatternExtract
    PatternExtract --> SkillAcquisition
    SkillAcquisition --> PolicyUpdate
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        DevServer[Next.js Dev Server<br/>Port 3000]
        HMR[Hot Module Reload]
    end
    
    subgraph "Production Build"
        Static[Static Export<br/>yarn export]
        Standalone[Standalone Build<br/>yarn build]
    end
    
    subgraph "Deployment Targets"
        GitHubPages[GitHub Pages<br/>Static Hosting]
        Docker[Docker Container<br/>Self-Hosted]
        Vercel[Vercel Platform<br/>Serverless]
    end
    
    subgraph "Optional Services"
        ProxyServer[HTTP Proxy Server]
        MLCEndpoint[MLC-LLM Endpoint]
        CogEndpoint[CogServer Endpoint]
    end
    
    DevServer --> HMR
    
    Static --> GitHubPages
    Standalone --> Docker
    Standalone --> Vercel
    
    Docker -.->|Optional| ProxyServer
    Docker -.->|Optional| MLCEndpoint
    Docker -.->|Optional| CogEndpoint
    
    style GitHubPages fill:#e1f5ff
    style Docker fill:#ffe1e1
    style Vercel fill:#e1ffe1
```

## Technology Stack Summary

| Layer | Technologies |
|-------|-------------|
| **Framework** | Next.js 13, React 18, TypeScript 5 |
| **State Management** | Zustand 4 with persistence middleware |
| **LLM Execution** | @mlc-ai/web-llm (WebGPU), WebAssembly |
| **Cognitive System** | OpenCog (Atomese, MeTTa, PLN, ECAN, MOSES) |
| **UI Components** | React components with CSS modules, Sass |
| **Markdown Rendering** | react-markdown, rehype-highlight, remark-gfm |
| **Diagrams** | Mermaid.js for visualization |
| **Build Tools** | Webpack 5, SWC, Babel |
| **Code Quality** | ESLint, Prettier, Husky, lint-staged |
| **PWA** | Service Worker, @serwist/next |
| **Storage** | IndexedDB (model cache), LocalStorage (state) |

## Security & Privacy Architecture

```mermaid
graph TB
    subgraph "Privacy Guarantees"
        LocalExec[100% Local Execution]
        NoCloud[No Cloud Dependencies]
        Offline[Offline Capable]
    end
    
    subgraph "Data Flow Control"
        BrowserSandbox[Browser Sandbox]
        NoNetworkData[No Network Data Transfer]
        LocalStorage[Local-Only Storage]
    end
    
    subgraph "Optional External Connections"
        OptionalMLC[Optional: MLC-LLM API]
        OptionalCog[Optional: CogServer]
        UserControl[User-Controlled]
    end
    
    LocalExec --> NoCloud
    NoCloud --> Offline
    
    BrowserSandbox --> NoNetworkData
    NoNetworkData --> LocalStorage
    
    UserControl --> OptionalMLC
    UserControl --> OptionalCog
    
    style LocalExec fill:#e1ffe1
    style NoCloud fill:#e1ffe1
    style Offline fill:#e1ffe1
```

## Performance Characteristics

| Aspect | Characteristic |
|--------|----------------|
| **Model Loading** | One-time download, cached in IndexedDB |
| **Inference** | WebGPU acceleration, browser-native |
| **Latency** | 50-500ms per token (hardware dependent) |
| **Memory** | 2-8GB RAM for typical models |
| **Storage** | 1-10GB for model weights |
| **Scalability** | Single-user, local execution only |

## Future Architecture Considerations

1. **Distributed Agent Systems**: Multi-device agent coordination
2. **P2P Knowledge Sharing**: Decentralized AtomSpace synchronization
3. **Advanced Reasoning**: Integration of additional cognitive architectures
4. **Model Fine-tuning**: In-browser model adaptation
5. **Multi-modal Processing**: Enhanced vision and audio capabilities

## References

- [WebLLM Documentation](https://github.com/mlc-ai/web-llm)
- [OpenCog Framework](https://opencog.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Zustand State Management](https://github.com/pmndrs/zustand)
