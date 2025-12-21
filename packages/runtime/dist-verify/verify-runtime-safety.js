import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer, toRuntimeResolver, assertResolverProvides } from "./index.js";
// Define ports
const AppPort = createPort("App");
const LoggerPort = createPort("Logger");
const DatabasePort = createPort("Database");
const RequestContextPort = createPort("RequestContext");
// Define basic adapters
const loggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    factory: (_) => "logger",
    lifetime: "singleton"
});
const databaseAdapter = createAdapter({
    provides: DatabasePort,
    requires: [],
    factory: (_) => "database",
    lifetime: "singleton"
});
const appAdapter = createAdapter({
    provides: AppPort,
    requires: [LoggerPort, DatabasePort],
    factory: ({ Logger, Database }) => ({ logger: Logger, db: Database }),
    lifetime: "singleton"
});
const requestContextAdapter = createAdapter({
    provides: RequestContextPort,
    requires: [],
    factory: (_) => ({ id: Math.random() }),
    lifetime: "scoped"
});
async function verifyRuntimeSafety() {
    console.log("Verifying Runtime Safety...");
    // Build graph - cast to any to bypass strict compile-time checks for this runtime test
    const builder = GraphBuilder.create();
    const graph = builder
        .provide(loggerAdapter)
        .provide(databaseAdapter)
        .provide(appAdapter)
        .provide(requestContextAdapter)
        .build();
    // Create container
    const container = createContainer(graph);
    // Verify container.has()
    console.log("Checking container.has()...");
    if (container.has(LoggerPort) !== true)
        throw new Error("Container should have LoggerPort");
    if (container.has(DatabasePort) !== true)
        throw new Error("Container should have DatabasePort");
    if (container.has(AppPort) !== true)
        throw new Error("Container should have AppPort");
    // Container should NOT have scoped service from root
    if (container.has(RequestContextPort) !== false)
        throw new Error("Root container should NOT have scoped RequestContextPort");
    // Verify Scope
    console.log("Checking scope.has()...");
    const scope = container.createScope();
    if (scope.has(LoggerPort) !== true)
        throw new Error("Scope should have LoggerPort (inherited)");
    if (scope.has(RequestContextPort) !== true)
        throw new Error("Scope should have RequestContextPort");
    // Verify RuntimeResolver
    console.log("Checking RuntimeResolver.has()...");
    const runtimeResolver = toRuntimeResolver(container);
    if (runtimeResolver.has(LoggerPort) !== true)
        throw new Error("RuntimeResolver should have LoggerPort");
    if (runtimeResolver.has(RequestContextPort) !== false)
        throw new Error("RuntimeResolver (root) should NOT have RequestContextPort");
    // Verify TypedResolver
    console.log("Checking TypedResolver.has()...");
    const typedResolver = assertResolverProvides(runtimeResolver);
    if (typedResolver.has(LoggerPort) !== true)
        throw new Error("TypedResolver should have LoggerPort");
    // Verify RuntimeContainer (initialized)
    console.log("Checking initialized container...");
    const initialized = await container.initialize();
    if (initialized.has(LoggerPort) !== true)
        throw new Error("Initialized container should have LoggerPort");
    console.log("✅ Verification Successful!");
}
verifyRuntimeSafety().catch(err => {
    console.error("❌ Verification Failed:", err);
    if (typeof process !== "undefined")
        process.exit(1);
});
