# OpenCog Integration - Example Usage

This document provides practical examples of using the OpenCog multi-agent orchestration system.

## Example 1: Basic Translation

### Natural Language to Atomese

```typescript
import { useOpenCogStore } from './app/store/opencog';
import { Format } from './app/opencog/types';

const openCogStore = useOpenCogStore();

// Initialize the system
openCogStore.initialize();

// Translate a natural language statement to Atomese
const result = await openCogStore.translate({
  input: "Dogs are mammals",
  sourceFormat: Format.NATURAL_LANGUAGE,
  targetFormat: Format.ATOMESE,
});

console.log(result.output);
// Output: (InheritanceLink (ConceptNode "dog") (ConceptNode "mammal"))
```

### Natural Language to MeTTa

```typescript
const result = await openCogStore.translate({
  input: "Define a function to calculate factorial",
  sourceFormat: Format.NATURAL_LANGUAGE,
  targetFormat: Format.METTA,
});

console.log(result.output);
// Output: (= (factorial 0) 1)
//         (= (factorial $n) (* $n (factorial (- $n 1))))
```

## Example 2: Agent Communication

### Send a Task to Translation Agent

```typescript
const openCogStore = useOpenCogStore();

// Create a translation task
const task = await openCogStore.createTask(
  "Convert 'All humans are mortal' to Atomese",
  "nl-to-atomese"
);

// Check task status
const completedTask = openCogStore.tasks.find(t => t.id === task.id);
console.log(completedTask?.result);
```

### Query the Knowledge Agent

```typescript
const agents = openCogStore.agents;
const knowledgeAgent = agents.find(a => a.role === "knowledge-manager");

if (knowledgeAgent) {
  await openCogStore.sendMessageToAgent(
    knowledgeAgent.id,
    "(ConceptNode \"human\")"
  );
}
```

## Example 3: Working with Atomese

### Parse Atomese Expression

```typescript
import { AtomeseParser } from './app/opencog/atomese';

const atomese = `
  (InheritanceLink
    (ConceptNode "Socrates")
    (ConceptNode "mortal"))
`;

const parsed = AtomeseParser.parse(atomese);
console.log(parsed);
// Output: {
//   type: "InheritanceLink",
//   children: [
//     { type: "ConceptNode", name: "Socrates" },
//     { type: "ConceptNode", name: "mortal" }
//   ]
// }
```

### Generate Atomese

```typescript
import { AtomeseParser, AtomType } from './app/opencog';

const atom = {
  type: AtomType.EVALUATION_LINK,
  children: [
    { type: AtomType.PREDICATE_NODE, name: "likes" },
    {
      type: AtomType.LIST_LINK,
      children: [
        { type: AtomType.CONCEPT_NODE, name: "Alice" },
        { type: AtomType.CONCEPT_NODE, name: "pizza" }
      ]
    }
  ]
};

const atomese = AtomeseParser.generate(atom);
console.log(atomese);
// Output: (EvaluationLink (PredicateNode "likes") (ListLink (ConceptNode "Alice") (ConceptNode "pizza")))
```

## Example 4: Working with MeTTa

### Parse MeTTa Expression

```typescript
import { MeTTaParser } from './app/opencog/metta';

const metta = "(: Human Type)";
const parsed = MeTTaParser.parse(metta);
console.log(parsed);
```

### Generate MeTTa Patterns

```typescript
import { MeTTaParser } from './app/opencog/metta';

// Type declaration
const typeDecl = MeTTaParser.patterns.typeDeclaration("Person", "Type");
console.log(MeTTaParser.generate(typeDecl));
// Output: (: Person Type)

// Arrow type
const arrowType = MeTTaParser.patterns.arrowType("Person", "knows Person");
console.log(MeTTaParser.generate(arrowType));
// Output: (-> Person (knows Person))

// Function definition
const funcDef = MeTTaParser.patterns.functionDefinition(
  "add",
  ["$x", "$y"],
  { type: "atom", value: "(+ $x $y)" }
);
console.log(MeTTaParser.generate(funcDef));
// Output: (= (add $x $y) (+ $x $y))
```

## Example 5: CogServer Integration

### Connect to CogServer

```typescript
import { useOpenCogStore } from './app/store/opencog';

const openCogStore = useOpenCogStore();

// Configure connection
openCogStore.setCogServerConfig({
  host: "localhost",
  port: 17001,
  protocol: "ws",
  reconnect: true,
});

// Connect
await openCogStore.connectToCogServer();
```

### Execute Commands on CogServer

```typescript
// Execute Atomese
const result = await openCogStore.executeCogServerCommand(
  "(ConceptNode \"test\")",
  "atomese"
);

// Execute MeTTa
const mettaResult = await openCogStore.executeCogServerCommand(
  "(: TestType Type)",
  "metta"
);

// Execute Scheme
const schemeResult = await openCogStore.executeCogServerCommand(
  "(display \"Hello from Scheme\")",
  "scheme"
);
```

## Example 6: Complex Reasoning

### Multi-Step Logical Inference

```typescript
// Step 1: Define knowledge in Atomese
const knowledge = [
  "(InheritanceLink (ConceptNode \"Socrates\") (ConceptNode \"human\"))",
  "(InheritanceLink (ConceptNode \"human\") (ConceptNode \"mortal\"))",
  "(ImplicationLink (ConceptNode \"mortal\") (ConceptNode \"will-die\"))"
];

// Step 2: Load into CogServer
for (const atom of knowledge) {
  await openCogStore.executeCogServerCommand(atom, "atomese");
}

// Step 3: Query for inference
const query = "(InheritanceLink (ConceptNode \"Socrates\") (ConceptNode \"mortal\"))";
const result = await openCogStore.executeCogServerCommand(query, "atomese");

console.log(result);
```

## Example 7: Agent Orchestration

### Collaborative Task Processing

```typescript
const openCogStore = useOpenCogStore();

// Create a complex task that requires multiple agents
const task = await openCogStore.createTask(
  "Analyze the concept of consciousness and represent it in both Atomese and MeTTa",
  undefined, // Let orchestrator decide which agent
  5 // High priority
);

// The orchestrator will:
// 1. Assign to PlanningAgent to decompose the task
// 2. Use TranslationAgent for format conversion
// 3. Use ReasoningAgent for concept analysis
// 4. Use KnowledgeAgent to store results

// Monitor progress
const interval = setInterval(() => {
  const currentTask = openCogStore.tasks.find(t => t.id === task.id);
  console.log("Task status:", currentTask?.status);
  
  if (currentTask?.status === "completed") {
    console.log("Result:", currentTask.result);
    clearInterval(interval);
  }
}, 1000);
```

## Example 8: Real-time Agent Monitoring

```typescript
import { useEffect } from 'react';
import { useOpenCogStore } from './app/store/opencog';

function AgentMonitor() {
  const openCogStore = useOpenCogStore();
  
  useEffect(() => {
    // Initialize system
    openCogStore.initialize();
    
    // Refresh agents every 2 seconds
    const interval = setInterval(() => {
      openCogStore.refreshAgents();
      openCogStore.refreshTasks();
      openCogStore.refreshMessages();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div>
      <h2>Active Agents: {openCogStore.agents.length}</h2>
      <h2>Pending Tasks: {openCogStore.tasks.filter(t => t.status === 'pending').length}</h2>
      <h2>Messages: {openCogStore.messageHistory.length}</h2>
    </div>
  );
}
```

## Example 9: Custom Agent Development

### Creating a Custom Agent

```typescript
import { BaseAgent } from './app/opencog/agents';
import { AgentStatus } from './app/opencog/types';

class SentimentAgent extends BaseAgent {
  constructor() {
    super("SentimentAgent", "sentiment-analyzer", [
      "analyze-sentiment",
      "emotion-detection",
      "tone-analysis"
    ]);
  }
  
  protected async processTask(
    task: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    // Analyze sentiment of the input text
    const sentiment = this.analyzeSentiment(task);
    
    // Return result in Atomese format
    return `(EvaluationLink 
      (PredicateNode "has-sentiment")
      (ListLink
        (ConceptNode "${task.substring(0, 20)}...")
        (ConceptNode "${sentiment}")))`;
  }
  
  protected async answerQuery(
    query: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    return `I can analyze sentiment, detect emotions, and analyze tone.`;
  }
  
  private analyzeSentiment(text: string): string {
    // Simple sentiment analysis
    const positive = ["good", "great", "happy", "excellent"];
    const negative = ["bad", "sad", "terrible", "awful"];
    
    const lowerText = text.toLowerCase();
    
    if (positive.some(word => lowerText.includes(word))) {
      return "positive";
    } else if (negative.some(word => lowerText.includes(word))) {
      return "negative";
    }
    
    return "neutral";
  }
}

// Register the custom agent
const sentimentAgent = new SentimentAgent();
openCogStore.orchestrator?.registerAgent(sentimentAgent);
```

## Example 10: Batch Translation

```typescript
import { TranslationRequest, Format } from './app/opencog/types';

const requests: TranslationRequest[] = [
  {
    input: "Cats are animals",
    sourceFormat: Format.NATURAL_LANGUAGE,
    targetFormat: Format.ATOMESE,
  },
  {
    input: "Dogs are mammals",
    sourceFormat: Format.NATURAL_LANGUAGE,
    targetFormat: Format.ATOMESE,
  },
  {
    input: "Birds can fly",
    sourceFormat: Format.NATURAL_LANGUAGE,
    targetFormat: Format.METTA,
  },
];

// Translate all at once
const results = await Promise.all(
  requests.map(req => openCogStore.translate(req))
);

results.forEach((result, index) => {
  console.log(`Translation ${index + 1}:`);
  console.log(`Input: ${requests[index].input}`);
  console.log(`Output: ${result.output}`);
  console.log('---');
});
```

## Tips and Best Practices

1. **Always initialize**: Call `openCogStore.initialize()` before using the system
2. **Handle errors**: Wrap translation and CogServer calls in try-catch blocks
3. **Monitor agent status**: Check agent status before sending critical tasks
4. **Use capabilities**: Query agents by capability to find the right one for your task
5. **Clean up**: Call `openCogStore.shutdown()` when done to free resources
6. **Test with mock**: Use the mock CogServer for development and testing
7. **Validate syntax**: Use `AtomeseParser.validate()` and `MeTTaParser.validate()` before sending to CogServer
8. **Context matters**: Provide context in translation requests for better results

## Troubleshooting

### Common Issues

**Q: Agents not showing up?**
A: Make sure you called `openCogStore.initialize()` and `openCogStore.refreshAgents()`

**Q: Translation not working?**
A: Check that the system is initialized and the LLM is loaded

**Q: CogServer connection fails?**
A: Verify the host and port are correct, and CogServer is running

**Q: Mock server not responding?**
A: The mock server always returns success. Make sure you're using it correctly.

## Next Steps

- Explore the [full API documentation](./OPENCOG_INTEGRATION.md)
- Review the source code in `app/opencog/`
- Try the interactive UI panels
- Connect to a real CogServer for advanced features
