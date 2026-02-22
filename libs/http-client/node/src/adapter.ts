/**
 * Node.js http/https transport adapter for @hex-di/http-client.
 *
 * Provides `HttpClientPort` using node:http and node:https modules directly.
 * Pure Node.js — no external dependencies beyond the standard library.
 *
 * @packageDocumentation
 */

import * as http from "node:http";
import * as https from "node:https";
import { createAdapter, SINGLETON } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import {
  HttpClientPort,
  createHttpClient,
  httpRequestError,
  toQueryString,
  headersToRecord,
  createHttpResponse,
  createHeaders,
  isEmptyBody,
  isTextBody,
  isJsonBody,
  isUint8ArrayBody,
  isUrlEncodedBody,
  isFormDataBody,
  isStreamBody,
} from "@hex-di/http-client";
import type { HttpRequest, HttpResponse, HttpRequestError } from "@hex-di/http-client";

// =============================================================================
// Options
// =============================================================================

/**
 * Options for `createNodeHttpClient`.
 */
export interface NodeHttpClientOptions {
  /** Custom HTTP agent. Default: new http.Agent with keep-alive. */
  readonly httpAgent?: http.Agent;

  /** Custom HTTPS agent. Default: new https.Agent with keep-alive. */
  readonly httpsAgent?: https.Agent;

  /** Maximum number of sockets per host. Default: 10. */
  readonly maxSockets?: number;

  /** Connection timeout in ms. Default: 30000. */
  readonly connectTimeout?: number;
}

// =============================================================================
// Body serialization
// =============================================================================

interface SerializedNodeBody {
  readonly buffer: Buffer | undefined;
  readonly stream: ReadableStream<Uint8Array> | undefined;
  readonly contentType: string | undefined;
}

function serializeBody(httpBody: Parameters<typeof isEmptyBody>[0]): SerializedNodeBody {
  if (isEmptyBody(httpBody)) {
    return { buffer: undefined, stream: undefined, contentType: undefined };
  }
  if (isTextBody(httpBody)) {
    return {
      buffer: Buffer.from(httpBody.value, "utf-8"),
      stream: undefined,
      contentType: httpBody.contentType,
    };
  }
  if (isJsonBody(httpBody)) {
    return {
      buffer: Buffer.from(JSON.stringify(httpBody.value), "utf-8"),
      stream: undefined,
      contentType: "application/json",
    };
  }
  if (isUint8ArrayBody(httpBody)) {
    return {
      buffer: Buffer.from(httpBody.value),
      stream: undefined,
      contentType: httpBody.contentType,
    };
  }
  if (isUrlEncodedBody(httpBody)) {
    const params = new URLSearchParams();
    for (const [key, value] of httpBody.value.entries) {
      params.append(key, value);
    }
    return {
      buffer: Buffer.from(params.toString(), "utf-8"),
      stream: undefined,
      contentType: "application/x-www-form-urlencoded",
    };
  }
  if (isFormDataBody(httpBody)) {
    // FormData is not directly supported with node:http — treat as empty body.
    // Use a fetch-based adapter (Fetch, Undici) for multipart form data.
    return { buffer: undefined, stream: undefined, contentType: undefined };
  }
  if (isStreamBody(httpBody)) {
    return {
      buffer: undefined,
      stream: httpBody.value,
      contentType: httpBody.contentType,
    };
  }

  const _exhaustive: never = httpBody;
  return _exhaustive;
}

// =============================================================================
// Headers conversion
// =============================================================================

function convertIncomingHeaders(
  raw: http.IncomingMessage["headers"],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.join(", ");
    }
  }
  return result;
}

// =============================================================================
// Error mapping
// =============================================================================

function getErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as Record<string, unknown>)["code"];
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function mapNodeError(error: unknown): HttpRequestError["reason"] {
  if (error instanceof DOMException) {
    if (error.name === "TimeoutError") return "Timeout";
    if (error.name === "AbortError") return "Aborted";
  }
  if (error instanceof Error) {
    const name = error.name;
    if (name === "AbortError") return "Aborted";
    if (name === "TimeoutError") return "Timeout";
    const code = getErrorCode(error);
    if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET") {
      return "Transport";
    }
    if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
      return "Timeout";
    }
  }
  return "Transport";
}

// =============================================================================
// Internals: write body to request
// =============================================================================

function writeBodyToRequest(
  req: http.ClientRequest,
  serialized: SerializedNodeBody,
  reject: (reason: unknown) => void,
): void {
  if (serialized.stream !== undefined) {
    const reader = serialized.stream.getReader();
    const writeChunks = (): void => {
      reader.read().then(({ done, value }) => {
        if (done) {
          req.end();
          return;
        }
        req.write(value);
        writeChunks();
      }, reject);
    };
    writeChunks();
  } else if (serialized.buffer !== undefined) {
    req.write(serialized.buffer);
    req.end();
  } else {
    req.end();
  }
}

// =============================================================================
// Core execute function
// =============================================================================

function executeNodeRequest(
  request: HttpRequest,
  parsedUrl: URL,
  signal: AbortSignal | undefined,
  agents: { http: http.Agent; https: https.Agent },
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const isHttps = parsedUrl.protocol === "https:";
    const transport = isHttps ? https : http;
    const agent = isHttps ? agents.https : agents.http;

    const serialized = serializeBody(request.body);
    const headerRecord: Record<string, string> = { ...headersToRecord(request.headers) };
    if (serialized.contentType !== undefined && !("content-type" in headerRecord)) {
      headerRecord["content-type"] = serialized.contentType;
    }
    if (serialized.buffer !== undefined) {
      headerRecord["content-length"] = String(serialized.buffer.byteLength);
    }

    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port !== "" ? parsedUrl.port : isHttps ? "443" : "80",
      path: parsedUrl.pathname + parsedUrl.search,
      method: request.method,
      headers: headerRecord,
      agent,
    };

    const req = transport.request(options, (res) => {
      const chunks: Buffer[] = [];

      res.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const rawBuffer = Buffer.concat(chunks);
        const rawBody = rawBuffer.byteLength > 0 ? new Uint8Array(rawBuffer) : undefined;
        const headerEntries = convertIncomingHeaders(res.headers);

        resolve(
          createHttpResponse({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? "",
            headers: createHeaders(headerEntries),
            request,
            rawBody,
          }),
        );
      });

      res.on("error", reject);
    });

    // Handle abort signal
    if (signal !== undefined) {
      if (signal.aborted) {
        req.destroy(new DOMException("Request aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => {
        req.destroy(new DOMException("Request aborted", "AbortError"));
      });
    }

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new DOMException("Request timeout", "TimeoutError"));
    });

    writeBodyToRequest(req, serialized, reject);
  });
}

function executeRequest(
  request: HttpRequest,
  agents: { http: http.Agent; https: https.Agent },
): ResultAsync<HttpResponse, HttpRequestError> {
  const { url, urlParams } = request;

  const queryString = toQueryString(urlParams);
  const finalUrl = queryString ? `${url}?${queryString}` : url;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(finalUrl);
  } catch (cause) {
    return ResultAsync.err(
      httpRequestError("InvalidUrl", request, `Invalid URL: ${finalUrl}`, cause),
    );
  }

  // Combine signal and timeout into a single AbortSignal
  let signal: AbortSignal | undefined;
  if (request.timeoutMs !== undefined && request.signal !== undefined) {
    signal = AbortSignal.any([request.signal, AbortSignal.timeout(request.timeoutMs)]);
  } else if (request.timeoutMs !== undefined) {
    signal = AbortSignal.timeout(request.timeoutMs);
  } else if (request.signal !== undefined) {
    signal = request.signal;
  }

  const promise = executeNodeRequest(request, parsedUrl, signal, agents);

  return ResultAsync.fromPromise(promise, (error) => {
    const reason = mapNodeError(error);
    const message = error instanceof Error ? error.message : String(error);
    return httpRequestError(reason, request, message, error);
  });
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an `HttpClient` backed by Node.js `node:http` and `node:https`.
 *
 * @example
 * ```typescript
 * // Default: uses keep-alive agents with up to 10 sockets per host
 * const client = createNodeHttpClient();
 *
 * // Custom agent configuration
 * const client = createNodeHttpClient({ maxSockets: 50 });
 * ```
 */
export function createNodeHttpClient(options?: NodeHttpClientOptions) {
  const maxSockets = options?.maxSockets ?? 10;
  const httpAgent =
    options?.httpAgent ?? new http.Agent({ keepAlive: true, maxSockets });
  const httpsAgent =
    options?.httpsAgent ?? new https.Agent({ keepAlive: true, maxSockets });

  const agents = { http: httpAgent, https: httpsAgent };

  return createHttpClient((request) => executeRequest(request, agents));
}

// =============================================================================
// Pre-built Adapter
// =============================================================================

/**
 * Pre-built HexDI adapter that provides `HttpClientPort` using Node.js built-in HTTP modules.
 *
 * Register this in your graph to inject an `HttpClient` into services that
 * depend on `HttpClientPort`.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { NodeHttpClientAdapter } from "@hex-di/http-client-node";
 *
 * const graph = GraphBuilder.create()
 *   .provide(NodeHttpClientAdapter)
 *   .provide(UserServiceAdapter) // requires HttpClientPort
 *   .build();
 * ```
 */
export const NodeHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: SINGLETON,
  factory: () => createNodeHttpClient(),
});
