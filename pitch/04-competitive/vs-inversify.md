# HexDI vs InversifyJS

> For teams using InversifyJS or TSyringe, and for teams considering a lightweight DI container.

---

## The One-Line Summary

InversifyJS was the best TypeScript DI option in 2016. In 2026, it has not aged well. It depends on non-standard language features, validates at runtime, and stops at the container — it has no ecosystem. HexDI is everything InversifyJS tried to be, built on modern TypeScript, with compile-time validation and a complete application platform.

---

## The reflect-metadata Problem

InversifyJS requires `reflect-metadata`. So does TSyringe. So does every decorator-based DI container from the 2016 era.

`reflect-metadata` is a proposed browser API that was never standardized, never adopted natively, and exists only as a polyfill. It works by tagging constructor parameters with type metadata at runtime, which requires `emitDecoratorMetadata: true` in TypeScript — a feature that emits non-standard JavaScript that most modern build tools cannot correctly handle.

The consequences:

1. **Build tool fragility**: esbuild, Bun's bundler, Vite, and Turbopack have documented, unsolved issues with `emitDecoratorMetadata`. Getting InversifyJS to work with a modern monorepo often requires special configuration that breaks something else.

2. **Runtime dependency**: The entire DI system depends on decorator metadata being correctly emitted. If the build tool strips or mishandles the metadata, you get silent failures or cryptic errors at service resolution time — not at build time.

3. **TC39 decorator churn**: The decorators proposal went through three major revisions. The decorators InversifyJS uses (`experimentalDecorators`) are not the same as the Stage 3 decorators in TypeScript 5.0+. Migrating is a significant breaking change.

**With HexDI:** No decorators, no `reflect-metadata`. The type system is built on TypeScript's native generic type system — standard TypeScript that works identically in every build tool, every environment, every TypeScript version since 5.0.

---

## Runtime Validation vs Compile-Time Validation

InversifyJS validates the dependency graph at runtime, when the container is first used.

```typescript
// This compiles fine
@injectable()
class MyService {
  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.Database) private db: Database,
  ) {}
}

// At runtime: ERROR if Logger or Database was never bound
const container = new Container();
container.bind<MyService>(MyService).toSelf();
const service = container.get<MyService>(MyService); // might throw here
```

If the container is constructed correctly in tests but a production-specific binding is missing, the error surfaces in production.

**With HexDI:** The entire dependency graph is validated by TypeScript at compile time. If `LoggerPort` is not provided in the graph, the code does not compile. The error is:

```
Type Error: MissingDependencyError<typeof LoggerPort>
Expected: [...existing ports, typeof LoggerPort]
Got: [...existing ports]
```

You cannot ship an application with a missing dependency. The compiler prevents it.

---

## String Keys vs Typed Tokens

InversifyJS uses symbol-based identifiers:

```typescript
const TYPES = {
  Logger: Symbol.for("Logger"),
  Database: Symbol.for("Database"),
};

container.get<Logger>(TYPES.Logger); // type is Logger, but key is a Symbol
```

The type annotation on `.get<Logger>()` is a manual assertion — TypeScript cannot verify that `TYPES.Logger` actually resolves to a `Logger`. If you bind a `Database` implementation to `TYPES.Logger`, TypeScript will not catch it. You get a runtime error.

**With HexDI:** Port tokens carry their type as a phantom type parameter:

```typescript
const LoggerPort = createPort<"Logger", Logger>("Logger");
container.resolve(LoggerPort); // returns Logger — not because you annotated it, because the type is in the port
```

The type of the resolved service is derived from the port definition. It cannot be wrong.

---

## No Ecosystem

InversifyJS is a DI container and nothing else. If you want:
- Structured logging → choose and integrate Pino, Winston, or Bunyan yourself
- State management → choose and integrate Redux, Zustand, or MobX yourself
- Data fetching → choose and integrate React Query or SWR yourself
- State machines → choose and integrate XState yourself
- Distributed tracing → choose and integrate OpenTelemetry SDK yourself

Each integration requires:
- Understanding how the library's instantiation model maps to InversifyJS
- Writing custom binding factories
- Writing custom test infrastructure for each library
- Maintaining the integrations across major version updates

**With HexDI:** Every library in the ecosystem is a port/adapter pair. The same GraphBuilder that wires your services wires your logger, your tracer, your state machine, and your workflow orchestrator. One testing model for all of them.

---

## The Lifetime Scope Model

InversifyJS supports three lifetimes: `inSingletonScope()`, `inRequestScope()`, and `inTransientScope()`. These are set at binding time — the same symbol can be bound to different lifetimes in different containers.

There is no compile-time enforcement of lifetime correctness. A singleton can silently hold a reference to a request-scoped service. This is a common production bug in InversifyJS applications.

**With HexDI:** Lifetimes are declared on the adapter. A singleton adapter that depends on a scoped adapter is a compile error. The lifetime rules are structural.

---

## Migration Path From InversifyJS

For teams currently using InversifyJS who want HexDI's compile-time guarantees:

1. **Identify existing services**: each `@injectable()` class becomes an adapter with explicit `provides` and `requires`
2. **Replace symbol keys with typed ports**: each `Symbol.for("X")` becomes a `createPort<"X", XInterface>("X")`
3. **Replace container bindings with GraphBuilder declarations**: each `container.bind()` becomes a `.provide()` call
4. **Run the compiler**: missing or incorrect wiring surfaces as compile errors

The migration is mechanical. The reward is compile-time correctness for every dependency in the application.

---

## The Bottom Line

| | InversifyJS | HexDI |
|---|---|---|
| DI validation | Runtime | Compile time |
| reflect-metadata | Required | Not used |
| Build tool compatibility | Fragile | Universal |
| Token type safety | Manual annotation (unsafe) | Derived from port definition (safe) |
| Lifetime scope enforcement | None | Compile time |
| Ecosystem | None | 30+ packages, one model |
| Testing | Custom per-library | Uniform TestGraphBuilder |
| GxP compliance pathway | None | Built-in structural graph |
