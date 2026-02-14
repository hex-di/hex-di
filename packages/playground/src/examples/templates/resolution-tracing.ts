/**
 * Resolution Tracing
 *
 * Demonstrates resolution timing and dependency chain tracing,
 * showing how to observe the container's resolution process.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

interface Config { readonly apiUrl: string; }
interface HttpClient { get(url: string): string; }
interface ApiClient { fetchUsers(): string[]; }

const ConfigPort = port<Config>()({ name: "Config" });
const HttpClientPort = port<HttpClient>()({ name: "HttpClient" });
const ApiClientPort = port<ApiClient>()({ name: "ApiClient" });

const configAdapter = createAdapter({
  provides: ConfigPort,
  factory: () => {
    console.log("[Trace] Resolving Config...");
    return { apiUrl: "https://api.example.com" };
  },
  lifetime: "singleton",
});

const httpClientAdapter = createAdapter({
  provides: HttpClientPort,
  requires: [ConfigPort],
  factory: ({ Config }) => {
    console.log(\`[Trace] Resolving HttpClient (apiUrl: \${Config.apiUrl})...\`);
    return {
      get: (url: string) => {
        console.log(\`[Trace] GET \${url}\`);
        return \`{"data": "response from \${url}"}\`;
      },
    };
  },
  lifetime: "singleton",
});

const apiClientAdapter = createAdapter({
  provides: ApiClientPort,
  requires: [HttpClientPort, ConfigPort],
  factory: ({ HttpClient, Config }) => {
    console.log("[Trace] Resolving ApiClient...");
    return {
      fetchUsers: () => {
        const response = HttpClient.get(\`\${Config.apiUrl}/users\`);
        console.log("[Trace] Fetched users:", response);
        return [response];
      },
    };
  },
  lifetime: "singleton",
});

const graph = GraphBuilder.create()
  .provide(configAdapter)
  .provide(httpClientAdapter)
  .provide(apiClientAdapter)
  .build();

const container = createContainer({ graph, name: "TracingExample" });

console.log("--- Starting resolution ---");
const api = container.resolve(ApiClientPort);
console.log("--- Resolution complete ---");

const users = api.fetchUsers();
console.log("Users:", users);
`;

export const resolutionTracing: ExampleTemplate = {
  id: "resolution-tracing",
  title: "Resolution Tracing",
  description: "Resolution timing and dependency chain tracing through the container",
  category: "patterns",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "tracing",
};
