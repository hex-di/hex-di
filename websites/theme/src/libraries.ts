export interface LibraryInfo {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly npm: string;
  readonly accent: string;
  readonly subdomain: string;
  readonly description: string;
}

export const LIBRARIES: readonly LibraryInfo[] = [
  {
    id: "core",
    name: "HexDI",
    tagline: "Type-Safe Dependency Injection for TypeScript",
    npm: "hex-di",
    accent: "#00F0FF",
    subdomain: "",
    description: "Compile-time validated DI with ports, adapters, and hexagonal architecture.",
  },
  {
    id: "result",
    name: "Result",
    tagline: "Type-Safe Error Handling for TypeScript",
    npm: "@hex-di/result",
    accent: "#A6E22E",
    subdomain: "result",
    description:
      "Rust-inspired Result<T, E> with pattern matching and railway-oriented programming.",
  },
  {
    id: "flow",
    name: "Flow",
    tagline: "Type-Safe State Machines for TypeScript",
    npm: "@hex-di/flow",
    accent: "#AB47BC",
    subdomain: "flow",
    description: "Statecharts with compile-time validated transitions, guards, and effects.",
  },
  {
    id: "guard",
    name: "Guard",
    tagline: "Type-Safe Authorization for TypeScript",
    npm: "@hex-di/guard",
    accent: "#F59E0B",
    subdomain: "guard",
    description: "Policy-based authorization with 10 composable policy kinds and audit trails.",
  },
  {
    id: "saga",
    name: "Saga",
    tagline: "Type-Safe Saga Orchestration for TypeScript",
    npm: "@hex-di/saga",
    accent: "#FFB020",
    subdomain: "saga",
    description: "Distributed transaction orchestration with compensation and checkpointing.",
  },
  {
    id: "query",
    name: "Query",
    tagline: "Type-Safe Data Querying for TypeScript",
    npm: "@hex-di/query",
    accent: "#00C4D4",
    subdomain: "query",
    description: "Declarative query building with caching, pagination, and optimistic updates.",
  },
  {
    id: "store",
    name: "Store",
    tagline: "Type-Safe State Management for TypeScript",
    npm: "@hex-di/store",
    accent: "#26A69A",
    subdomain: "store",
    description: "Reactive state management with selectors, middleware, and devtools.",
  },
  {
    id: "logger",
    name: "Logger",
    tagline: "Structured Logging for TypeScript",
    npm: "@hex-di/logger",
    accent: "#A6E22E",
    subdomain: "logger",
    description: "Structured, context-aware logging with multiple transports and log levels.",
  },
  {
    id: "tracing",
    name: "Tracing",
    tagline: "Distributed Tracing for TypeScript",
    npm: "@hex-di/tracing",
    accent: "#00F0FF",
    subdomain: "tracing",
    description: "OpenTelemetry-compatible tracing with spans, contexts, and propagation.",
  },
  {
    id: "clock",
    name: "Clock",
    tagline: "Time Abstraction for TypeScript",
    npm: "@hex-di/clock",
    accent: "#F92672",
    subdomain: "clock",
    description: "Testable time abstraction with real, fake, and frozen clock implementations.",
  },
  {
    id: "crypto",
    name: "Crypto",
    tagline: "Cryptographic Operations for TypeScript",
    npm: "@hex-di/crypto",
    accent: "#FF6EA0",
    subdomain: "crypto",
    description: "Type-safe cryptographic operations with hashing, encryption, and signing.",
  },
  {
    id: "http-client",
    name: "HTTP Client",
    tagline: "Type-Safe HTTP Client for TypeScript",
    npm: "@hex-di/http-client",
    accent: "#5FFFFF",
    subdomain: "http-client",
    description: "Declarative HTTP client with interceptors, retries, and type-safe responses.",
  },
] as const;

export function getLibraryUrl(library: LibraryInfo): string {
  if (library.subdomain === "") return "https://hexdi.dev";
  return `https://${library.subdomain}.hexdi.dev`;
}

export function getLibraryById(id: string): LibraryInfo | undefined {
  return LIBRARIES.find(lib => lib.id === id);
}
