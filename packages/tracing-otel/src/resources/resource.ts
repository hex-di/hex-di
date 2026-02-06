/**
 * Resource metadata builder for service identification.
 *
 * Resources represent service-level attributes following OpenTelemetry semantic
 * conventions. These attributes identify the service generating the telemetry data.
 *
 * @packageDocumentation
 */

import { type Resource, resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAMESPACE,
} from "@opentelemetry/semantic-conventions";

/**
 * Configuration for creating a Resource with service identification metadata.
 *
 * Resource attributes follow OpenTelemetry semantic conventions to ensure
 * consistent service identification across observability backends.
 *
 * @remarks
 * - `serviceName` is required per OTEL-06 (service.name is a required attribute)
 * - Other fields are optional but recommended for production environments
 * - Additional custom attributes can be provided via `attributes` field
 *
 * @example
 * ```typescript
 * const resource = createResource({
 *   serviceName: 'hex-di-api',
 *   serviceVersion: '1.2.3',
 *   deploymentEnvironment: 'production',
 *   serviceNamespace: 'platform',
 *   attributes: {
 *     'cloud.provider': 'aws',
 *     'cloud.region': 'us-west-2',
 *   },
 * });
 * ```
 */
export interface ResourceConfig {
  /**
   * Logical name of the service.
   *
   * Maps to OpenTelemetry's `service.name` semantic convention (REQUIRED).
   * This is the primary identifier for grouping telemetry data.
   *
   * @example 'hex-di-api', 'user-service', 'payment-processor'
   */
  serviceName: string;

  /**
   * Version of the service code.
   *
   * Maps to OpenTelemetry's `service.version` semantic convention.
   * Should match the deployed version number.
   *
   * @example '1.2.3', '2.0.0-beta.1'
   */
  serviceVersion?: string;

  /**
   * Deployment environment (staging, production, etc.).
   *
   * Maps to OpenTelemetry's `deployment.environment` semantic convention.
   * Distinguishes telemetry from different deployment stages.
   *
   * @example 'production', 'staging', 'development'
   */
  deploymentEnvironment?: string;

  /**
   * Namespace for grouping related services.
   *
   * Maps to OpenTelemetry's `service.namespace` semantic convention.
   * Useful for organizing services within larger systems.
   *
   * @example 'platform', 'payments', 'user-management'
   */
  serviceNamespace?: string;

  /**
   * Additional custom resource attributes.
   *
   * Use for cloud provider metadata, deployment details, or any
   * service-level context not covered by standard fields.
   *
   * @example { 'cloud.provider': 'aws', 'k8s.pod.name': 'api-7b9c4d-abc' }
   */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Create an OpenTelemetry Resource with service identification metadata.
 *
 * Converts HexDI resource configuration to OpenTelemetry's Resource format,
 * mapping standard fields to semantic convention attributes.
 *
 * **Standard Attributes:**
 * - `service.name` (required) - Primary service identifier
 * - `service.version` - Deployed version number
 * - `deployment.environment` - Environment (prod/staging/dev)
 * - `service.namespace` - Logical grouping of services
 *
 * @param config - Resource configuration with service metadata
 * @returns OpenTelemetry Resource instance
 *
 * @remarks
 * - `service.name` is the only required field per OpenTelemetry specification
 * - All other fields are optional but strongly recommended for production
 * - Custom attributes are merged with standard semantic conventions
 * - Resource is immutable after creation
 *
 * @example
 * ```typescript
 * // Minimal configuration
 * const resource = createResource({
 *   serviceName: 'my-service',
 * });
 *
 * // Full configuration
 * const resource = createResource({
 *   serviceName: 'hex-di-api',
 *   serviceVersion: '1.2.3',
 *   deploymentEnvironment: 'production',
 *   serviceNamespace: 'platform',
 *   attributes: {
 *     'cloud.provider': 'aws',
 *     'cloud.region': 'us-west-2',
 *   },
 * });
 * ```
 */
export function createResource(config: ResourceConfig): Resource {
  const attributes: Record<string, string | number | boolean> = {
    // Required: service.name per OpenTelemetry semantic conventions
    [ATTR_SERVICE_NAME]: config.serviceName,
  };

  // Optional: service.version
  if (config.serviceVersion !== undefined) {
    attributes[ATTR_SERVICE_VERSION] = config.serviceVersion;
  }

  // Optional: deployment.environment
  if (config.deploymentEnvironment !== undefined) {
    attributes[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT] = config.deploymentEnvironment;
  }

  // Optional: service.namespace
  if (config.serviceNamespace !== undefined) {
    attributes[SEMRESATTRS_SERVICE_NAMESPACE] = config.serviceNamespace;
  }

  // Merge any additional custom attributes
  if (config.attributes) {
    Object.assign(attributes, config.attributes);
  }

  return resourceFromAttributes(attributes);
}
