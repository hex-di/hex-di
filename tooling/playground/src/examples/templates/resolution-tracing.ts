/**
 * Resolution Tracing
 *
 * Demonstrates resolution timing and dependency chain tracing,
 * showing how to observe the container's resolution process.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { port, createAdapter, adapterOrElse, type FactoryResult } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

interface Config { readonly apiUrl: string; }
interface HttpClient { get(url: string): string; }
interface ApiClient { fetchUsers(): string[]; }

const ConfigPort = port<Config>()({ name: "Config" });
const HttpClientPort = port<HttpClient>()({ name: "HttpClient" });
const ApiClientPort = port<ApiClient>()({ name: "ApiClient" });

// --- Tagged error types ---

interface ConfigError { readonly _tag: "ConfigError"; readonly reason: string; }
interface HttpClientError { readonly _tag: "HttpClientError"; readonly reason: string; }
interface ApiClientError { readonly _tag: "ApiClientError"; readonly reason: string; }

// --- Primary (fallible) adapters ---

const configAdapter = createAdapter({
  provides: ConfigPort,
  factory: (): FactoryResult<Config, ConfigError> => {
    console.log("[Trace] Resolving Config...");
    return { _tag: "Ok", value: { apiUrl: "https://api.example.com" } };
  },
  lifetime: "singleton",
});

const httpClientAdapter = createAdapter({
  provides: HttpClientPort,
  requires: [ConfigPort],
  factory: ({ Config }): FactoryResult<HttpClient, HttpClientError> => {
    console.log(\`[Trace] Resolving HttpClient (apiUrl: \${Config.apiUrl})...\`);
    return {
      _tag: "Ok",
      value: {
        get: (url: string) => {
          console.log(\`[Trace] GET \${url}\`);
          return \`{"data": "response from \${url}"}\`;
        },
      },
    };
  },
  lifetime: "singleton",
});

const apiClientAdapter = createAdapter({
  provides: ApiClientPort,
  requires: [HttpClientPort, ConfigPort],
  factory: ({ HttpClient, Config }): FactoryResult<ApiClient, ApiClientError> => {
    console.log("[Trace] Resolving ApiClient...");
    return {
      _tag: "Ok",
      value: {
        fetchUsers: () => {
          const response = HttpClient.get(\`\${Config.apiUrl}/users\`);
          console.log("[Trace] Fetched users:", response);
          return [response];
        },
      },
    };
  },
  lifetime: "singleton",
});

// --- Fallback (infallible) adapters ---

const configFallback = createAdapter({
  provides: ConfigPort,
  factory: () => {
    console.log("[Trace] Using fallback Config");
    return { apiUrl: "http://fallback" };
  },
  lifetime: "singleton",
});

const httpClientFallback = createAdapter({
  provides: HttpClientPort,
  requires: [ConfigPort],
  factory: ({ Config }) => {
    console.log(\`[Trace] Using fallback HttpClient (apiUrl: \${Config.apiUrl})\`);
    return {
      get: (_url: string) => {
        console.log("[Trace] Fallback GET");
        return "fallback";
      },
    };
  },
  lifetime: "singleton",
});

const apiClientFallback = createAdapter({
  provides: ApiClientPort,
  requires: [HttpClientPort, ConfigPort],
  factory: ({ HttpClient: _http, Config: _cfg }) => {
    console.log("[Trace] Using fallback ApiClient");
    return { fetchUsers: () => [] };
  },
  lifetime: "singleton",
});

// --- Graph with adapterOrElse ---

const graph = GraphBuilder.create()
  .provide(adapterOrElse(configAdapter, configFallback))
  .provide(adapterOrElse(httpClientAdapter, httpClientFallback))
  .provide(adapterOrElse(apiClientAdapter, apiClientFallback))
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
