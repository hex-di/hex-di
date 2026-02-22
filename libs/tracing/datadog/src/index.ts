/**
 * @hex-di/tracing-datadog - DataDog APM bridge for HexDI distributed tracing.
 *
 * This package provides a lightweight bridge between HexDI's distributed tracing
 * system and DataDog APM using the dd-trace library. Unlike OpenTelemetry exporters,
 * this uses DataDog's proprietary protocol for native DataDog features.
 *
 * ## Why DataDog Bridge?
 *
 * DataDog APM has features beyond standard distributed tracing:
 * - **Profiling**: CPU and memory profiling integrated with traces
 * - **Application Security**: Runtime application self-protection (RASP)
 * - **Log Correlation**: Automatic trace ID injection into logs
 * - **Service Maps**: Native service dependency visualization
 * - **Live Tail**: Real-time log and trace streaming
 *
 * While you can send traces to DataDog via OpenTelemetry (OTLP), using dd-trace
 * directly enables these proprietary features and optimizations.
 *
 * ## Installation
 *
 * This package requires dd-trace as a peer dependency. Install both:
 *
 * ```bash
 * npm install @hex-di/tracing-datadog dd-trace
 * # or
 * pnpm add @hex-di/tracing-datadog dd-trace
 * ```
 *
 * ## Why Peer Dependency?
 *
 * dd-trace is ~50MB+ with native dependencies. By making it a peer dependency,
 * users who don't need DataDog integration don't pay the bundle size cost.
 * You install dd-trace yourself and pass the initialized tracer to our bridge.
 *
 * ## Usage
 *
 * @example
 * ```typescript
 * import tracer from 'dd-trace';
 * import { createDataDogBridge } from '@hex-di/tracing-datadog';
 * import { createBatchSpanProcessor } from '@hex-di/tracing-otel';
 * import { createTracer } from '@hex-di/tracing';
 *
 * // 1. Initialize dd-trace with your configuration
 * tracer.init({
 *   service: 'my-service',
 *   env: 'production',
 *   version: '1.2.3',
 *   // DataDog agent connection
 *   hostname: 'localhost',
 *   port: 8126,
 *   // Enable optional features
 *   logInjection: true,  // Inject trace IDs into logs
 *   profiling: { enabled: true },  // CPU/memory profiling
 *   appsec: { enabled: false },    // Application security
 * });
 *
 * // 2. Create bridge with initialized tracer
 * const exporter = createDataDogBridge({ tracer });
 *
 * // 3. Use with HexDI tracing system
 * const processor = createBatchSpanProcessor(exporter);
 * const hexTracer = createTracer({ processor });
 *
 * // 4. Your spans now go to DataDog APM
 * const span = hexTracer.startSpan('user.login');
 * span.setAttribute('user.id', '12345');
 * span.end();
 * ```
 *
 * ## DataDog Agent
 *
 * The DataDog agent must be running to receive traces. Options:
 *
 * **Local Development (Docker):**
 * ```bash
 * docker run -d --name dd-agent \
 *   -e DD_API_KEY=your_api_key \
 *   -e DD_APM_ENABLED=true \
 *   -p 8126:8126 \
 *   datadog/agent:latest
 * ```
 *
 * **Kubernetes (DaemonSet):**
 * ```yaml
 * apiVersion: apps/v1
 * kind: DaemonSet
 * metadata:
 *   name: datadog-agent
 * spec:
 *   template:
 *     spec:
 *       containers:
 *       - name: agent
 *         image: datadog/agent:latest
 *         env:
 *         - name: DD_API_KEY
 *           valueFrom:
 *             secretKeyRef:
 *               name: datadog-secret
 *               key: api-key
 *         - name: DD_APM_ENABLED
 *           value: "true"
 *         ports:
 *         - containerPort: 8126
 * ```
 *
 * ## Configuration
 *
 * All dd-trace configuration happens via `tracer.init()`. See:
 * https://docs.datadoghq.com/tracing/setup_overview/setup/nodejs/
 *
 * Common options:
 * - `service`: Service name (required)
 * - `env`: Environment (development, staging, production)
 * - `version`: Service version for deployment tracking
 * - `hostname`/`port`: DataDog agent connection
 * - `tags`: Global tags applied to all spans
 * - `sampleRate`: Sampling rate (0-1, default: 1)
 * - `logInjection`: Inject trace IDs into logs
 * - `profiling`: Enable continuous profiling
 * - `appsec`: Enable application security monitoring
 *
 * ## Error Handling
 *
 * The bridge logs export failures but never throws. This ensures telemetry
 * issues don't break your application. Check logs for messages:
 *
 * ```
 * [hex-di/tracing-datadog] DataDog export failed: <error>
 * [hex-di/tracing-datadog] Failed to export span <name>: <error>
 * ```
 *
 * ## Differences from OpenTelemetry
 *
 * | Feature | DataDog Bridge | OTLP Exporter |
 * |---------|---------------|---------------|
 * | Protocol | DataDog proprietary | OpenTelemetry standard |
 * | Profiling | Yes | No |
 * | APM features | Full | Limited |
 * | Log injection | Yes | Via collector |
 * | Security monitoring | Yes | No |
 * | Vendor lock-in | DataDog only | Portable |
 * | Bundle size | ~50MB (peer dep) | ~2MB |
 *
 * **When to use DataDog bridge:**
 * - You're committed to DataDog as your observability platform
 * - You need profiling or security features
 * - You want native DataDog service maps and UI
 *
 * **When to use OTLP:**
 * - You want vendor portability
 * - You only need distributed tracing
 * - You're using a multi-vendor observability strategy
 *
 * @packageDocumentation
 */

export { createDataDogBridge } from "./bridge.js";
export type { DataDogBridgeConfig, DdSpan, DdTracer } from "./types.js";
export { mapSpanKindToDataDog } from "./utils.js";
