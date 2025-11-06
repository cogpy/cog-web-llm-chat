# Advanced OpenCog Features Examples

This document provides practical examples of using the advanced OpenCog features implemented in the system.

## Table of Contents

1. [PLN Reasoning](#pln-reasoning)
2. [ECAN Attention Allocation](#ecan-attention-allocation)
3. [MOSES Evolution](#moses-evolution)
4. [Agent Learning](#agent-learning)
5. [Persistent Memory](#persistent-memory)
6. [Knowledge Base Import/Export](#knowledge-base-importexport)
7. [Advanced Query Builder](#advanced-query-builder)
8. [AtomSpace Visualization](#atomspace-visualization)
9. [Performance Monitoring](#performance-monitoring)

## PLN Reasoning

### Basic Inference

```typescript
import { PLNReasoner, deductionRule, inductionRule } from './opencog/reasoning';
import { AtomNode, AtomType } from './opencog/types';

// Create atoms with truth values
const humanMortal: AtomNode = {
  type: AtomType.IMPLICATION_LINK,
  children: [
    { type: AtomType.CONCEPT_NODE, name: "human" },
    { type: AtomType.CONCEPT_NODE, name: "mortal" }
  ],
  truthValue: { strength: 0.95, confidence: 0.9 }
};

const socratesHuman: AtomNode = {
  type: AtomType.IMPLICATION_LINK,
  children: [
    { type: AtomType.CONCEPT_NODE, name: "Socrates" },
    { type: AtomType.CONCEPT_NODE, name: "human" }
  ],
  truthValue: { strength: 1.0, confidence: 1.0 }
};

// Perform reasoning
const reasoner = new PLNReasoner();
const result = await reasoner.reason([humanMortal, socratesHuman]);

console.log(`Derived ${result.derived.length} new atoms`);
console.log(`Average confidence: ${result.confidence}`);
```

### Using Truth Value Rules

```typescript
import { revisionRule, conjunctionRule, negationRule } from './opencog/reasoning';

// Combine evidence from multiple sources
const tv1 = { strength: 0.8, confidence: 0.7 };
const tv2 = { strength: 0.9, confidence: 0.6 };
const revised = revisionRule(tv1, tv2);

// Conjunction: A AND B
const tvAnd = conjunctionRule(tv1, tv2);

// Negation: NOT A
const tvNot = negationRule(tv1);
```

## ECAN Attention Allocation

### Basic Attention Management

```typescript
import { ECANEngine, ImportanceDiffusion } from './opencog/reasoning';

const ecan = new ECANEngine();

// Add atoms to attention network
ecan.addAtom("atom1", {
  type: AtomType.CONCEPT_NODE,
  name: "important-concept"
});

// Stimulate an atom (increase its STI)
ecan.stimulate("atom1", 50);

// Run attention spreading
for (let i = 0; i < 10; i++) {
  ecan.spreadAttention();
}

// Get atoms in attentional focus
const focusedAtoms = ecan.getAtomicFocus();
console.log(`${focusedAtoms.length} atoms in focus`);

// Get statistics
const stats = ecan.getStatistics();
console.log(`Total STI: ${stats.totalSTI}`);
console.log(`Average STI: ${stats.averageSTI}`);
```

### Importance Diffusion

```typescript
const diffusion = new ImportanceDiffusion(ecan);

// Focus attention on specific atoms
diffusion.focusOn(["atom1", "atom2", "atom3"], 80);

// Run diffusion for multiple steps
await diffusion.diffuse(20);
```

## MOSES Evolution

### Basic Evolution

```typescript
import { MOSESEngine, ProgramBuilder } from './opencog/reasoning';

const moses = new MOSESEngine({
  populationSize: 100,
  maxGenerations: 50,
  mutationRate: 0.1,
  crossoverRate: 0.7
});

// Define fitness function
moses.setFitnessFunction(async (program) => {
  // Evaluate program and return fitness score (0-1)
  // Higher is better
  return Math.random(); // Example
});

// Initialize population
await moses.initializePopulation(() => {
  return ProgramBuilder.randomProgram(4);
});

// Run evolution
const best = await moses.evolve(50);
console.log(`Best fitness: ${best.fitness}`);
```

### Custom Program Creation

```typescript
// Create a program: (+ (* x 2) 3)
const program = ProgramBuilder.func(
  "+",
  ProgramBuilder.func(
    "*",
    ProgramBuilder.variable("x"),
    ProgramBuilder.constant(2)
  ),
  ProgramBuilder.constant(3)
);
```

## Agent Learning

### Recording Experiences

```typescript
import { AgentLearning, PersistentMemory } from './opencog/memory';

const memory = new PersistentMemory();
await memory.initialize();

const learning = new AgentLearning("agent-1", memory);

// Record successful experience
await learning.recordExperience(
  "translation",
  "nl-to-atomese",
  "success",
  { language: "english", complexity: "simple" }
);

// Record failure
await learning.recordExperience(
  "translation",
  "atomese-to-metta",
  "failure",
  { complexity: "complex" }
);
```

### Action Selection

```typescript
// Select best action based on learned strategies
const action = await learning.selectAction(
  "translation",
  { language: "english", complexity: "simple" },
  ["nl-to-atomese", "nl-to-metta", "atomese-to-metta"]
);

console.log(`Selected action: ${action}`);

// Get learning statistics
const stats = learning.getStatistics();
console.log(`Total strategies: ${stats.totalStrategies}`);
console.log(`Success rate: ${(stats.averageSuccessRate * 100).toFixed(1)}%`);
```

## Persistent Memory

### Storing Memories

```typescript
import { PersistentMemory } from './opencog/memory';

const memory = new PersistentMemory();
await memory.initialize();

// Store a memory
await memory.store({
  agentId: "reasoning-agent",
  type: "knowledge",
  content: {
    topic: "logical-inference",
    rules: ["deduction", "induction"]
  },
  importance: 0.85,
  timestamp: Date.now(),
  accessCount: 0,
  lastAccessed: Date.now()
});
```

### Querying Memories

```typescript
// Query by agent and type
const memories = await memory.query({
  agentId: "reasoning-agent",
  type: "knowledge",
  minImportance: 0.7,
  sortBy: "importance",
  limit: 10
});

// Search by content
const searchResults = await memory.query({
  searchTerm: "logical-inference",
  sortBy: "timestamp"
});
```

### Memory Consolidation

```typescript
// Remove old, low-importance memories
const deleted = await memory.consolidate();
console.log(`Deleted ${deleted} old memories`);

// Get statistics
const stats = await memory.getStatistics();
console.log(`Total memories: ${stats.totalMemories}`);
console.log(`By type:`, stats.byType);
console.log(`Average importance: ${stats.averageImportance}`);
```

## Knowledge Base Import/Export

### Exporting Knowledge

```typescript
import { downloadKnowledgeBase, exportKnowledgeBaseJSON } from './opencog/knowledge';

// Export to JSON
const jsonString = exportKnowledgeBaseJSON(atoms, {
  description: "My knowledge base",
  author: "OpenCog User"
});

// Download as file
downloadKnowledgeBase(atoms, "json", "my-knowledge-base.json");
downloadKnowledgeBase(atoms, "atomese", "my-knowledge-base.scm");
downloadKnowledgeBase(atoms, "metta", "my-knowledge-base.metta");
```

### Importing Knowledge

```typescript
import { uploadKnowledgeBase, importKnowledgeBaseJSON } from './opencog/knowledge';

// Import from file
const { atoms, format } = await uploadKnowledgeBase(file);
console.log(`Imported ${atoms.length} atoms from ${format}`);

// Import from JSON string
const atoms = importKnowledgeBaseJSON(jsonString);
```

### Merging Knowledge Bases

```typescript
import { mergeKnowledgeBases } from './opencog/knowledge';

// Merge two knowledge bases
const merged = mergeKnowledgeBases(kb1, kb2, "merge-tv");
// Options: "keep-first", "keep-last", "merge-tv"
```

## Advanced Query Builder

### Visual Query Building

```typescript
import { AtomQueryBuilder } from './opencog/knowledge';

const query = new AtomQueryBuilder();

// Build query with multiple criteria
query
  .where({ type: AtomType.CONCEPT_NODE })
  .where({ minTruthStrength: 0.8 })
  .where({ hasChildren: true })
  .combine("AND")
  .orderBy("truth-strength", "desc")
  .setLimit(50);

// Execute query
const results = query.execute(atomSpace);

// Process results
results.forEach(result => {
  console.log(`Atom: ${result.atom.name}`);
  console.log(`Score: ${result.score}`);
  console.log(`Matches: ${result.matches.join(", ")}`);
});
```

### Complex Queries

```typescript
// Find all high-confidence inheritance links
query
  .where({
    type: AtomType.INHERITANCE_LINK,
    minTruthConfidence: 0.9,
    childCount: 2
  })
  .where({
    depth: { min: 1, max: 3 }
  })
  .combine("AND")
  .orderBy("truth-confidence", "desc");
```

### Pattern Matching

```typescript
import { PatternMatcher } from './opencog/knowledge';

const matcher = new PatternMatcher();

// Define pattern
const pattern = {
  type: AtomType.INHERITANCE_LINK,
  children: [
    { type: AtomType.CONCEPT_NODE, name: "cat" },
    "ANY" // Match any atom
  ]
};

// Find matching atoms
const matches = matcher.match(atomSpace, pattern);
```

## AtomSpace Visualization

### Using the Visualization Component

```typescript
import { AtomSpaceVisualization } from './components/opencog/visualization';
import { useOpenCogStore } from './store/opencog';

function MyComponent() {
  const openCogStore = useOpenCogStore();

  return (
    <AtomSpaceVisualization
      atoms={openCogStore.atomSpace}
      onAtomClick={(atom) => {
        console.log("Clicked:", atom);
      }}
      width={800}
      height={600}
    />
  );
}
```

### Adding Atoms to Visualization

```typescript
const openCogStore = useOpenCogStore();

// Add atom to visualize
openCogStore.addAtom({
  type: AtomType.CONCEPT_NODE,
  name: "example",
  truthValue: { strength: 0.9, confidence: 0.8 }
});

// Clear visualization
openCogStore.clearAtomSpace();
```

## Performance Monitoring

### Using the Dashboard

```typescript
import { PerformanceDashboard } from './components/opencog/visualization';
import { useOpenCogStore } from './store/opencog';

function MyComponent() {
  const openCogStore = useOpenCogStore();

  // Metrics update automatically
  return (
    <PerformanceDashboard
      metrics={openCogStore.performanceMetrics}
      updateInterval={1000}
    />
  );
}
```

### Manual Metrics Update

```typescript
const openCogStore = useOpenCogStore();

// Refresh all metrics
await openCogStore.refreshPerformanceMetrics();

// Access metrics
const metrics = openCogStore.performanceMetrics;
console.log(`PLN inferences: ${metrics.reasoning.plnInferences}`);
console.log(`Atoms in focus: ${metrics.attention.focusedAtoms}`);
console.log(`Best fitness: ${metrics.evolution.bestFitness}`);
```

## Complete Example: Reasoning with Visualization

```typescript
import { useOpenCogStore } from './store/opencog';

async function demonstrateReasoning() {
  const store = useOpenCogStore();

  // Initialize system
  await store.initialize();

  // Create atoms
  const atoms: AtomNode[] = [
    {
      type: AtomType.IMPLICATION_LINK,
      children: [
        { type: AtomType.CONCEPT_NODE, name: "bird" },
        { type: AtomType.CONCEPT_NODE, name: "animal" }
      ],
      truthValue: { strength: 1.0, confidence: 0.9 }
    },
    {
      type: AtomType.IMPLICATION_LINK,
      children: [
        { type: AtomType.CONCEPT_NODE, name: "canary" },
        { type: AtomType.CONCEPT_NODE, name: "bird" }
      ],
      truthValue: { strength: 1.0, confidence: 1.0 }
    }
  ];

  // Add to visualization
  atoms.forEach(atom => store.addAtom(atom));

  // Perform PLN reasoning
  const derived = await store.performPLNReasoning(atoms);
  console.log(`Derived ${derived.length} new atoms`);

  // Add derived atoms to visualization
  derived.forEach(atom => store.addAtom(atom));

  // Run ECAN attention
  await store.runECANAttention(10);

  // Update metrics
  await store.refreshPerformanceMetrics();

  // Export knowledge base
  downloadKnowledgeBase(store.atomSpace, "json");
}
```

## Tips and Best Practices

1. **Initialize Early**: Call `await store.initialize()` before using advanced features
2. **Monitor Performance**: Use the dashboard to track resource usage
3. **Regular Consolidation**: Run memory consolidation periodically to manage storage
4. **Adjust Parameters**: Tune ECAN spread rates and MOSES mutation rates for your use case
5. **Export Regularly**: Save your knowledge bases to avoid data loss
6. **Use Queries**: Query builder is more efficient than filtering arrays manually
7. **Learning Rate**: Start with higher exploration rates, decrease as strategies stabilize
8. **Truth Values**: Always provide truth values for atoms used in PLN reasoning

## Troubleshooting

### Memory Not Persisting

```typescript
// Ensure IndexedDB is initialized
const memory = new PersistentMemory();
await memory.initialize();

// Check if running in browser
if (typeof window === "undefined") {
  console.warn("IndexedDB not available in this environment");
}
```

### Low Reasoning Confidence

```typescript
// Use higher-confidence input atoms
const atom = {
  // ...
  truthValue: { strength: 0.95, confidence: 0.9 }
};

// Run more reasoning iterations
for (let i = 0; i < 10; i++) {
  await store.performPLNReasoning(atoms);
}
```

### Slow Evolution

```typescript
// Reduce population size or generations
const moses = new MOSESEngine({
  populationSize: 50,  // Smaller population
  maxGenerations: 25    // Fewer generations
});

// Or use simpler fitness functions
moses.setFitnessFunction(async (program) => {
  // Fast evaluation
  return simpleEval(program);
});
```
