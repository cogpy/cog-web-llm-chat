# Complete Integration Example

This document demonstrates how to use all four planned future enhancements together in a cohesive application.

## Overview

This example shows how to:
1. Initialize Hyperon integration
2. Create a visual programming interface
3. Enable multi-user collaboration
4. Install and use plugins from the marketplace

## Complete Setup Example

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { 
  getHyperonFFI, 
  getMettaExecutor, 
  getAtomSpaceSynchronizer 
} from './app/opencog/hyperon';
import { 
  KnowledgeGraphEditor,
  ForceDirectedLayout
} from './app/components/visual-programming';
import { 
  CollaborativeEditingManager 
} from './app/collaboration';
import { 
  getPluginManager,
  getAgentMarketplace 
} from './app/plugins';
import { AtomNode } from './app/opencog/types';

export function IntegratedOpenCogWorkspace() {
  const [atoms, setAtoms] = useState<AtomNode[]>([]);
  const [hyperonReady, setHyperonReady] = useState(false);
  const [collabReady, setCollabReady] = useState(false);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([]);
  
  // Store managers in refs to reuse instances
  const collabManagerRef = useRef<CollaborativeEditingManager | null>(null);
  const syncManagerRef = useRef<any>(null);

  useEffect(() => {
    initializeWorkspace();
  }, []);

  async function initializeWorkspace() {
    // Step 1: Initialize Hyperon
    console.log('Initializing Hyperon...');
    const ffi = getHyperonFFI({
      wasmPath: '/hyperon/hyperon-core.wasm',
      nativeEnabled: process.env.NODE_ENV === 'production',
      memoryLimit: 100 * 1024 * 1024, // 100MB
    });
    await ffi.initialize();

    const executor = getMettaExecutor();
    await executor.initialize();

    const sync = getAtomSpaceSynchronizer({
      autoSync: true,
      syncInterval: 5000,
      conflictResolution: 'merge'
    });
    await sync.initialize();
    syncManagerRef.current = sync;

    setHyperonReady(true);
    console.log('✓ Hyperon ready');

    // Step 2: Setup Collaboration
    console.log('Setting up collaboration...');
    const collab = new CollaborativeEditingManager({
      serverUrl: process.env.COLLAB_SERVER_URL || 'ws://localhost:8080/collab',
      sessionId: getCurrentSessionId(),
      userId: getCurrentUserId(),
      userName: getCurrentUserName()
    });

    await collab.startSession('Shared Knowledge Base');

    // Listen for presence updates
    collab.onPresence((users) => {
      setActiveUsers(users.length);
    });

    // Listen for remote edits
    collab.onEdit((event) => {
      if (event.type === 'edit') {
        handleRemoteEdit(event.data);
      }
    });

    // Store collab manager for reuse
    collabManagerRef.current = collab;
    setCollabReady(true);
    console.log('✓ Collaboration ready');

    // Step 3: Setup Plugin Marketplace
    console.log('Setting up plugins...');
    const marketplace = getAgentMarketplace();
    
    // Install recommended plugins
    const recommendedPlugins = marketplace.searchAgents({
      category: 'Reasoning',
      verified: true,
      minRating: 4.5
    });

    const pm = getPluginManager();
    for (const agent of recommendedPlugins.slice(0, 3)) {
      await marketplace.installAgent(agent.manifest.id);
      await pm.enablePlugin(agent.manifest.id);
    }

    setInstalledPlugins(pm.getInstalledPlugins().map(p => p.manifest.name));
    console.log('✓ Plugins ready');

    console.log('Workspace fully initialized!');
  }

  function handleRemoteEdit(edit: any) {
    // Handle edits from other users
    console.log('Remote edit received:', edit);
    // Update local state appropriately
  }

  function handleAtomsChange(newAtoms: AtomNode[]) {
    setAtoms(newAtoms);
    
    // Sync to Hyperon if ready (reuse stored sync manager)
    if (hyperonReady && syncManagerRef.current) {
      newAtoms.forEach(atom => syncManagerRef.current.addLocalAtom(atom));
    }

    // Broadcast to collaborators if ready (reuse stored collab manager)
    if (collabReady && collabManagerRef.current) {
      collabManagerRef.current.makeEdit({
        id: `edit-${Date.now()}`,
        userId: getCurrentUserId(),
        timestamp: Date.now(),
        path: ['atoms'],
        operation: 'update',
        value: newAtoms
      });
    }
  }

  async function executeReasoning() {
    if (!hyperonReady) {
      console.error('Hyperon not ready');
      return;
    }

    // Use plugin for reasoning if available
    const pm = getPluginManager();
    const reasoningPlugins = pm.getPluginsByCapability('reasoning:pln');
    
    if (reasoningPlugins.length > 0) {
      const result = await pm.executePluginCommand(
        reasoningPlugins[0],
        'reason',
        { atoms }
      );
      console.log('Reasoning result:', result);
    } else {
      // Fallback to direct MeTTa execution
      const executor = getMettaExecutor();
      const result = await executor.execute(`
        !(match &self (ConceptNode $x)
          (ConceptNode $x))
      `);
      console.log('MeTTa result:', result);
    }
  }

  return (
    <div className="integrated-workspace">
      <header>
        <h1>OpenCog Hyperon Workspace</h1>
        <div className="status">
          <span>Hyperon: {hyperonReady ? '✓' : '...'}</span>
          <span>Collaboration: {collabReady ? '✓' : '...'}</span>
          <span>Users: {activeUsers}</span>
          <span>Plugins: {installedPlugins.length}</span>
        </div>
      </header>

      <main>
        <div className="toolbar">
          <button onClick={executeReasoning} disabled={!hyperonReady}>
            Run Reasoning
          </button>
          <button onClick={() => {
            const marketplace = getAgentMarketplace();
            const agents = marketplace.getPopularAgents(10);
            console.log('Popular agents:', agents);
          }}>
            Browse Marketplace
          </button>
        </div>

        <KnowledgeGraphEditor
          atoms={atoms}
          onAtomsChange={handleAtomsChange}
          width={1200}
          height={800}
          readonly={false}
        />

        <aside>
          <h3>Active Plugins</h3>
          <ul>
            {installedPlugins.map(name => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}

// Helper functions
function getCurrentSessionId(): string {
  return sessionStorage.getItem('sessionId') || 
         `session-${Date.now()}`;
}

function getCurrentUserId(): string {
  // Use crypto.randomUUID() for secure ID generation in production
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return localStorage.getItem('userId') || 
           `user-${crypto.randomUUID()}`;
  }
  // Fallback for older browsers (not cryptographically secure)
  return localStorage.getItem('userId') || 
         `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentUserName(): string {
  return localStorage.getItem('userName') || 
         'Anonymous User';
}
```

## Advanced Usage Patterns

### Pattern 1: Real-time Collaborative Reasoning

```typescript
async function collaborativeReasoning(atoms: AtomNode[]) {
  // Setup
  const executor = getMettaExecutor();
  const collab = new CollaborativeEditingManager({
    serverUrl: 'ws://localhost:8080/collab',
    sessionId: 'reasoning-session',
    userId: getCurrentUserId(),
    userName: getCurrentUserName()
  });

  await collab.startSession('Collaborative Reasoning');

  // Execute reasoning
  const result = await executor.execute(`
    !(match &self 
      (Inheritance $x Animal)
      (Concept $x))
  `);

  // Share results with collaborators
  collab.makeEdit({
    id: `result-${Date.now()}`,
    userId: getCurrentUserId(),
    timestamp: Date.now(),
    path: ['reasoning', 'results'],
    operation: 'add',
    value: result
  });

  return result;
}
```

### Pattern 2: Plugin-Enhanced Visual Editing

```typescript
async function visualEditingWithPlugins() {
  const [atoms, setAtoms] = useState<AtomNode[]>([]);
  const pm = getPluginManager();

  // Install layout plugin
  const marketplace = getAgentMarketplace();
  const layoutPlugins = marketplace.searchAgents({
    capabilities: ['layout:advanced']
  });

  if (layoutPlugins.length > 0) {
    await marketplace.installAgent(layoutPlugins[0].manifest.id);
    await pm.enablePlugin(layoutPlugins[0].manifest.id);
  }

  function handleLayoutOptimize() {
    if (layoutPlugins.length > 0) {
      pm.executePluginCommand(
        layoutPlugins[0].manifest.id,
        'optimize',
        { atoms, width: 1200, height: 800 }
      ).then(optimizedLayout => {
        // Apply optimized layout
        setAtoms(optimizedLayout.atoms);
      });
    }
  }

  return (
    <div>
      <button onClick={handleLayoutOptimize}>Optimize Layout</button>
      <KnowledgeGraphEditor
        atoms={atoms}
        onAtomsChange={setAtoms}
        width={1200}
        height={800}
      />
    </div>
  );
}
```

### Pattern 3: Hyperon-Synced Marketplace

```typescript
async function installPluginFromHyperon() {
  const ffi = getHyperonFFI({ nativeEnabled: true });
  await ffi.initialize();

  // Query plugins from Hyperon AtomSpace
  const pluginAtoms = await ffi.queryAtoms({
    pattern: '(Plugin $id)',
    limit: 10
  });

  const marketplace = getAgentMarketplace();
  const pm = getPluginManager();

  for (const atom of pluginAtoms.data || []) {
    // Convert atom to plugin manifest
    const manifest = convertAtomToManifest(atom);
    
    // Install via marketplace
    await marketplace.submitAgent({
      manifest,
      category: ['Reasoning'],
      tags: manifest.capabilities,
      screenshots: [],
      readme: manifest.description
    });

    await marketplace.installAgent(manifest.id);
    await pm.enablePlugin(manifest.id);
  }
}

function convertAtomToManifest(atom: any): any {
  // Convert Hyperon atom representation to plugin manifest
  return {
    id: atom.id,
    name: atom.name,
    version: '1.0.0',
    description: atom.description,
    author: atom.author,
    capabilities: atom.capabilities || [],
    permissions: [],
    entryPoint: 'index.js'
  };
}
```

## Configuration

### Environment Variables

```bash
# Hyperon Configuration
HYPERON_WASM_PATH=/hyperon/hyperon-core.wasm
HYPERON_NATIVE_ENABLED=true
HYPERON_MEMORY_LIMIT=104857600  # 100MB

# Collaboration Configuration
COLLAB_SERVER_URL=ws://localhost:8080/collab
COLLAB_RECONNECT_ATTEMPTS=5
COLLAB_HEARTBEAT_INTERVAL=30000

# Plugin Configuration
PLUGIN_MARKETPLACE_URL=https://plugins.opencog.org
PLUGIN_SANDBOX_MEMORY=52428800  # 50MB
PLUGIN_SANDBOX_CPU_TIME=5000    # 5 seconds
```

### Configuration File

```typescript
// config/opencog.config.ts
export const openCogConfig = {
  hyperon: {
    ffi: {
      wasmPath: process.env.HYPERON_WASM_PATH || '/hyperon/hyperon-core.wasm',
      nativeEnabled: process.env.HYPERON_NATIVE_ENABLED === 'true',
      memoryLimit: parseInt(process.env.HYPERON_MEMORY_LIMIT || '104857600'),
    },
    sync: {
      autoSync: true,
      syncInterval: 5000,
      conflictResolution: 'merge' as const,
    },
  },
  collaboration: {
    serverUrl: process.env.COLLAB_SERVER_URL || 'ws://localhost:8080/collab',
    reconnectAttempts: parseInt(process.env.COLLAB_RECONNECT_ATTEMPTS || '5'),
    heartbeatInterval: parseInt(process.env.COLLAB_HEARTBEAT_INTERVAL || '30000'),
  },
  plugins: {
    marketplaceUrl: process.env.PLUGIN_MARKETPLACE_URL || 'https://plugins.opencog.org',
    sandbox: {
      maxMemory: parseInt(process.env.PLUGIN_SANDBOX_MEMORY || '52428800'),
      maxCPUTime: parseInt(process.env.PLUGIN_SANDBOX_CPU_TIME || '5000'),
      networkAccess: false,
      storageAccess: true,
    },
  },
  visualProgramming: {
    defaultLayout: 'force-directed' as const,
    canvasWidth: 1200,
    canvasHeight: 800,
    autoLayout: true,
  },
};
```

## Testing the Integration

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { getHyperonFFI } from './app/opencog/hyperon';
import { getPluginManager } from './app/plugins';
import { CollaborativeEditingManager } from './app/collaboration';

describe('Integrated OpenCog System', () => {
  beforeEach(async () => {
    // Reset state before each test
  });

  it('should initialize all subsystems', async () => {
    const ffi = getHyperonFFI({ nativeEnabled: false });
    const initialized = await ffi.initialize();
    expect(initialized).toBe(true);

    const pm = getPluginManager();
    expect(pm).toBeDefined();

    // Collaboration requires WebSocket server, tested separately
  });

  it('should sync atoms between visual editor and Hyperon', async () => {
    // Test implementation
  });

  it('should handle conflicts in collaborative editing', () => {
    // Test implementation
  });

  it('should execute plugin commands securely', async () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
describe('Full Integration Workflow', () => {
  it('should complete end-to-end workflow', async () => {
    // 1. Initialize systems
    const ffi = getHyperonFFI({ nativeEnabled: false });
    await ffi.initialize();

    // 2. Create atoms visually
    const atoms = [
      { type: 'ConceptNode', name: 'cat' },
      { type: 'ConceptNode', name: 'animal' },
      { type: 'InheritanceLink', children: ['cat', 'animal'] }
    ];

    // 3. Sync to Hyperon
    for (const atom of atoms) {
      await ffi.addAtom(atom);
    }

    // 4. Execute reasoning via plugin
    const pm = getPluginManager();
    const result = await pm.executePluginCommand(
      'test-reasoning-plugin',
      'reason',
      { atoms }
    );

    expect(result).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

1. **Hyperon WASM not loading**
   - Check WASM file path
   - Verify browser WebAssembly support
   - Check network connectivity
   - Fallback to mock mode for development

2. **Collaboration disconnects**
   - Verify WebSocket server is running
   - Check network connectivity
   - Review reconnection settings
   - Check firewall rules

3. **Plugin installation fails**
   - Verify plugin manifest structure
   - Check permissions
   - Review sandbox logs
   - Ensure capability compatibility

4. **Visual editor performance issues**
   - Reduce number of nodes
   - Enable canvas optimization
   - Use hierarchical layout for large graphs
   - Consider pagination

## Best Practices

1. **Always initialize Hyperon first** before other subsystems
2. **Use mock mode during development** to avoid dependency on external services
3. **Implement error handling** for all async operations
4. **Debounce frequent updates** to reduce network traffic
5. **Use capability-based security** for plugins
6. **Monitor memory usage** in long-running sessions
7. **Clean up resources** when components unmount
8. **Test with multiple users** for collaboration features

## Next Steps

- Implement WebSocket server for collaboration
- Deploy plugin marketplace backend
- Configure production Hyperon instance
- Add monitoring and analytics
- Implement user authentication
- Add data persistence layer
- Create plugin development SDK
- Build plugin testing framework

## Resources

- [Future Enhancements Documentation](./FUTURE_ENHANCEMENTS.md)
- [OpenCog Integration Guide](./OPENCOG_INTEGRATION.md)
- [Plugin Development Guide](./PLUGIN_DEVELOPMENT.md)
- [API Reference](./API_REFERENCE.md)
