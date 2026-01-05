# Raw Idea: @hex-di/flow

@hex-di/flow is a typed state machine runtime for HexDI with:

- Effect Model: Pure + Descriptors (effects are data, not side effects)
- Async Model: Sync transitions + Activities pattern
- DevTools: Full integration into existing @hex-di/devtools
- React: Separate @hex-di/flow-react package

Two new packages:

1. @hex-di/flow - Core state machine runtime with branded State/Event types, Effect descriptors, MachineRunner, Activities, HexDI integration, Tracing
2. @hex-di/flow-react - React hooks (useMachine, useSelector, useSend)

Key features:

- Compile-time validation of state machines
- Type-safe transitions with guards and actions
- Effect descriptors executed by adapters (hexagonal architecture)
- DevTools visibility into state transitions
- Integration with Zustand, React Query, Jotai
