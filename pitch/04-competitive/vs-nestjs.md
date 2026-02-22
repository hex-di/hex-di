# HexDI vs NestJS

> A full comparison for teams who are already using NestJS or are evaluating it as an alternative.

---

## The One-Line Summary

NestJS is a server-side framework that includes dependency injection. HexDI is a dependency injection platform with ecosystem libraries. They solve adjacent problems, but NestJS's DI is tightly coupled to its framework opinions, while HexDI's DI is framework-agnostic and compile-time validated.

If your team is doing server-side TypeScript, NestJS will tempt you with its completeness. Here is why that completeness is also its primary liability.

---

## The Framework Lock-In Problem

NestJS makes a fundamental trade-off: everything is a `@Module`. Services are `@Injectable`. Controllers are `@Controller`. To use NestJS DI, you must be inside the NestJS module system.

This means:
- Your business logic depends on NestJS decorators
- Your domain layer imports from NestJS packages
- Your testing must use NestJS testing utilities (`Test.createTestingModule()`)
- Your infrastructure decisions (server, middleware, routing) are made by NestJS

When NestJS makes a breaking change (and it does, regularly), your business logic must change too — because it is coupled to the framework.

**With HexDI:** `@hex-di/core`, `@hex-di/graph`, and `@hex-di/runtime` have zero framework dependencies. Your business logic knows nothing about HexDI internals. It only depends on typed port interfaces. The framework adapter (Hono, Express, Next.js) is one file.

---

## Decorators and reflect-metadata

NestJS requires:
- TypeScript `experimentalDecorators: true`
- TypeScript `emitDecoratorMetadata: true`
- The `reflect-metadata` polyfill installed globally

These are:
- **Non-standard**: decorators were in TC39 Stage 3 for years with a changing API; `reflect-metadata` is not a standard at all
- **Build tool incompatible**: Vite, esbuild, and SWC have limited or inconsistent support for `emitDecoratorMetadata`. Getting NestJS to work with modern build tools is a recurring integration problem
- **Runtime dependent**: the entire DI system resolves at runtime based on decorator metadata. If the metadata is wrong (due to build tool issues or circular imports in the module system), you get cryptic runtime errors

**With HexDI:** No decorators. No `reflect-metadata`. The type system is built on TypeScript generics and phantom types. It works with every modern build tool (Vite, esbuild, Turbopack, Bun) without configuration. And it validates at **compile time**, not runtime.

---

## Runtime Errors vs Compile Errors

| Scenario | NestJS | HexDI |
|---|---|---|
| Missing provider | Runtime exception when module loads | Compile error: `MissingDependencyError<typeof ServicePort>` |
| Circular dependency | Runtime error or undefined behavior | Compile error with full dependency chain |
| Wrong scope (singleton depending on scoped) | Subtle bug, discovered in production | Compile error |
| Unregistered token | Runtime exception | Compile error |

NestJS catches these errors when the application starts. If the application starts successfully on CI but has a production-specific configuration, the error surfaces in production.

HexDI catches these errors before the code compiles. They cannot reach CI, staging, or production.

---

## The Ecosystem Coupling

NestJS has a rich ecosystem: `@nestjs/typeorm`, `@nestjs/graphql`, `@nestjs/microservices`, etc. These are powerful. They are also strongly coupled to NestJS module conventions.

When you use `@nestjs/typeorm`, your repository layer becomes a NestJS module. Your business logic depends on NestJS TypeORM entities. Swapping the database ORM means migrating through the NestJS module system.

**With HexDI:** The database adapter is one file. Swapping means providing a new adapter and removing the old one. One line in the GraphBuilder. The compiler confirms the swap is complete.

---

## The Testing Overhead

NestJS testing requires:

```typescript
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
  providers: [{ provide: DatabaseService, useValue: mockDatabase }],
}).compile();
```

This starts the entire NestJS module system, including all lifecycle hooks, every time. Complex module trees with many providers make tests slow. Mock management is implicit and error-prone.

**With HexDI testing:**

```typescript
const testGraph = TestGraphBuilder.from(productionGraph)
  .override(mockDatabaseAdapter)
  .build();
const container = createContainer(testGraph);
```

The override is explicit, typed, and does not start any framework. Tests are fast. Mocks are declared, not injected through module overrides. The compiler validates that `mockDatabaseAdapter` satisfies `DatabasePort`.

---

## When NestJS Is the Right Choice

NestJS is appropriate when:
- The team wants an opinionated, batteries-included framework and accepts the coupling
- The project is a standard CRUD API with no need for strict domain isolation
- The team has existing NestJS expertise and migration cost outweighs structural benefits

Even in these cases, HexDI is compatible: `@hex-di/core` can be used alongside NestJS for specific subsystems where compile-time validation is critical (compliance-sensitive modules, complex dependency chains).

---

## The Bottom Line

| | NestJS | HexDI |
|---|---|---|
| DI validation | Runtime | Compile time |
| Decorator requirement | Required | None |
| reflect-metadata | Required | Not used |
| Build tool compatibility | Limited (esbuild issues) | Universal |
| Framework lock-in | Strong | None |
| Business logic coupling | To NestJS decorators | To typed interfaces only |
| Ecosystem | NestJS-specific | Universal port/adapter |
| Testing | NestJS test module (heavy) | TestGraphBuilder (lightweight) |
| GxP compliance pathway | Manual | Built-in (structural graph) |
| Swap backend | Module migration | One adapter file |
