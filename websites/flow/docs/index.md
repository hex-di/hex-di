---
sidebar_position: 1
title: Introduction
---

# Flow

Type-safe state machines for TypeScript with statecharts, compile-time validated transitions, guards, effects, and HexDI integration.

## Overview

Flow is a state machine runtime that provides maximum type safety, full type inference, zero type casts, and seamless integration with the @hex-di ecosystem for managing complex UI state transitions. Built on the principles of statecharts, Flow enables you to model complex application behavior declaratively while maintaining complete type safety.

## Features

- **Branded State Types**: State types with unique symbol branding for nominal typing, compile-time validation, and type-safe narrowing
- **Branded Event Types**: Event types with conditional payloads and full type inference for send() calls
- **Effects as Data**: Effect descriptors (InvokeEffect, SpawnEffect, EmitEffect, DelayEffect, etc.) are pure data structures, not side effects
- **Activity System**: Long-running processes with AbortSignal cancellation, EventSink for emitting events, and proper lifecycle management
- **HexDI Integration**: FlowAdapter pattern for seamless container integration, DIEffectExecutor for port resolution, scoped lifetime by default
- **DevTools Integration**: FlowCollector for transition tracing with zero overhead when disabled
- **Serialization Support**: Persist and restore machine state with version migrations and context validation
- **Testing Utilities**: Comprehensive testing package with mock executors, virtual clocks, and assertions
- **React Integration**: Type-safe React hooks with concurrent mode support

## Installation

```bash
pnpm add @hex-di/flow
```

For testing support:

```bash
pnpm add -D @hex-di/flow-testing
```

For React integration:

```bash
pnpm add @hex-di/flow-react
```

## Quick Start

Here's a simple example of a traffic light state machine:

```typescript
import { defineMachine, createMachineRunner, Effect } from "@hex-di/flow";

// Define the machine
const trafficLightMachine = defineMachine({
  id: "traffic-light",
  initial: "red",
  states: {
    red: {
      entry: [Effect.log("Red light")],
      on: {
        TIMER: {
          target: "green",
          effects: [Effect.delay(3000)],
        },
      },
    },
    green: {
      entry: [Effect.log("Green light")],
      on: {
        TIMER: {
          target: "yellow",
          effects: [Effect.delay(5000)],
        },
      },
    },
    yellow: {
      entry: [Effect.log("Yellow light")],
      on: {
        TIMER: {
          target: "red",
          effects: [Effect.delay(2000)],
        },
      },
    },
  },
});

// Create and run the machine
const runner = createMachineRunner(trafficLightMachine);

// Send events
runner.send({ type: "TIMER" });

// Query state
console.log(runner.state()); // 'green'

// Subscribe to transitions
const unsubscribe = runner.subscribe(snapshot => {
  console.log(`Transitioned to: ${snapshot.state}`);
});

// Clean up
runner.dispose();
```

## What's Next

- [States & Events](concepts/states-events.md) - Learn about state and event types
- [Building Machines](guides/building-machines.md) - Create your first state machine
- [Running Machines](guides/running-machines.md) - Execute and interact with machines
- [Testing](testing.md) - Test your state machine logic
- [React Integration](react.md) - Use Flow with React applications
