
import { describe, it, expect } from 'vitest';
import { createPort } from '@hex-di/ports';
import { createAdapter, GraphBuilder } from '@hex-di/graph';
import { createContainer } from './index.js';
import { toRuntimeResolver } from './adapters/react-resolver.js';

describe('Runtime Safety Verification', () => {
  it('should implement has(port) correctly across all interfaces', () => {
    // Setup
    interface Service { name: string }
    const PortA = createPort<"A", Service>("A");
    const PortB = createPort<"B", Service>("B");
    const PortScoped = createPort<"Scoped", Service>("Scoped");

    const AdapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: 'singleton',
      factory: () => ({ name: 'A' })
    });

    const AdapterScoped = createAdapter({
      provides: PortScoped,
      requires: [],
      lifetime: 'scoped',
      factory: () => ({ name: 'Scoped' })
    });

    const graph = GraphBuilder.create()
      .provide(AdapterA)
      .provide(AdapterScoped)
      .build();

    const container = createContainer(graph);

    // 1. Container.has checks
    expect(container.has(PortA)).toBe(true);
    expect(container.has(PortB)).toBe(false);
    expect(container.has(PortScoped)).toBe(false); // Root container cannot resolve scoped directly

    // 2. Scope.has checks
    const scope = container.createScope();
    expect(scope.has(PortA)).toBe(true);
    expect(scope.has(PortScoped)).toBe(true);
    expect(scope.has(PortB)).toBe(false);

    // 3. ChildContainer.has checks
    // Use extend for new port
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [],
      lifetime: 'singleton',
      factory: () => ({ name: 'B' })
    });
    
    // createChild returns a builder. extend() returns a new builder. build() returns container.
    const childContainer = container.createChild()
      .extend(AdapterB)
      .build();

    expect(childContainer.has(PortA)).toBe(true); // Inherited
    expect(childContainer.has(PortB)).toBe(true); // Extended
    expect(childContainer.has(PortScoped)).toBe(false); // Inherits "false" from root parent for scoped

    // 4. RuntimeResolver.has checks
    const runtimeResolver = toRuntimeResolver(container);
    expect(runtimeResolver.has(PortA)).toBe(true);
    expect(runtimeResolver.has(PortScoped)).toBe(false);

    const runtimeScope = toRuntimeResolver(scope);
    expect(runtimeScope.has(PortA)).toBe(true);
    expect(runtimeScope.has(PortScoped)).toBe(true);
  });
});
