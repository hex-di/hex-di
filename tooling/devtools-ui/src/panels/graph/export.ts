/**
 * Graph export functions.
 *
 * Supports DOT (Graphviz), Mermaid, SVG, PNG, JSON, and structured log
 * export formats.
 *
 * @packageDocumentation
 */

import type {
  ContainerGraphData,
  EnrichedGraphNode,
  EnrichedGraphEdge,
  GraphLayout,
  GraphFilterState,
} from "./types.js";
import { inspectionToJSON, toStructuredLogs } from "@hex-di/graph/advanced";
import type { GraphInspection, StructuredLogOptions } from "@hex-di/graph/advanced";

// =============================================================================
// DOT Export
// =============================================================================

/**
 * Export the graph as a Graphviz DOT string.
 */
function exportDot(graphData: ContainerGraphData, nodes: readonly EnrichedGraphNode[]): string {
  const lines: string[] = [];
  lines.push(`digraph "${graphData.containerName}" {`);
  lines.push("  rankdir=TB;");
  lines.push('  node [shape=box, style="rounded,filled"];');
  lines.push("");

  for (const node of nodes) {
    const label = node.adapter.portName;
    const lifetime = node.adapter.lifetime;
    const fillColor = getLifetimeDotColor(lifetime);
    lines.push(`  "${label}" [label="${label}\\n(${lifetime})", fillcolor="${fillColor}"];`);
  }

  lines.push("");

  for (const node of nodes) {
    for (const dep of node.adapter.dependencyNames) {
      lines.push(`  "${dep}" -> "${node.adapter.portName}";`);
    }
  }

  lines.push("}");
  return lines.join("\n");
}

/**
 * Export a subgraph of selected nodes as DOT.
 */
function buildSubgraphDot(
  graphData: ContainerGraphData,
  nodes: readonly EnrichedGraphNode[],
  selectedNodes: ReadonlySet<string>
): string {
  const relevant = nodes.filter(
    n =>
      selectedNodes.has(n.adapter.portName) ||
      n.adapter.dependencyNames.some(d => selectedNodes.has(d))
  );
  return exportDot(graphData, relevant);
}

// =============================================================================
// Mermaid Export
// =============================================================================

/**
 * Export the graph as a Mermaid flowchart string.
 */
function exportMermaid(nodes: readonly EnrichedGraphNode[]): string {
  const lines: string[] = [];
  lines.push("graph TD");

  for (const node of nodes) {
    const id = sanitizeMermaidId(node.adapter.portName);
    const label = node.adapter.portName;
    lines.push(`  ${id}["${label}"]`);
  }

  lines.push("");

  for (const node of nodes) {
    for (const dep of node.adapter.dependencyNames) {
      const sourceId = sanitizeMermaidId(dep);
      const targetId = sanitizeMermaidId(node.adapter.portName);
      lines.push(`  ${sourceId} --> ${targetId}`);
    }
  }

  return lines.join("\n");
}

/**
 * Sanitize an identifier for Mermaid (no special characters).
 */
function sanitizeMermaidId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

// =============================================================================
// SVG Export
// =============================================================================

/**
 * Export the current graph SVG element as a string.
 *
 * Extracts the SVG from the DOM, inlines computed styles, and returns
 * a self-contained SVG string.
 */
function exportSvg(svgElement: SVGSVGElement): string {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  // Set explicit dimensions
  const bbox = svgElement.getBBox();
  clone.setAttribute(
    "viewBox",
    `${bbox.x - 20} ${bbox.y - 20} ${bbox.width + 40} ${bbox.height + 40}`
  );
  clone.setAttribute("width", String(bbox.width + 40));
  clone.setAttribute("height", String(bbox.height + 40));

  const serializer = new XMLSerializer();
  return serializer.serializeToString(clone);
}

// =============================================================================
// PNG Export
// =============================================================================

/**
 * Export the current graph as a PNG data URL.
 *
 * Renders SVG to canvas then extracts PNG.
 */
async function exportPng(svgElement: SVGSVGElement, scale = 2): Promise<string> {
  const svgString = exportSvg(svgElement);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (ctx === null) {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG image"));
    };
    img.src = url;
  });
}

// =============================================================================
// JSON Export
// =============================================================================

/**
 * Export graph inspection data as JSON.
 *
 * Delegates to inspectionToJSON from @hex-di/graph/advanced.
 */
function exportInspectionJson(inspection: GraphInspection, timestamp?: string): string {
  const json = inspectionToJSON(inspection, timestamp ? { timestamp } : undefined);
  return JSON.stringify(json, null, 2);
}

// =============================================================================
// Structured Logs Export
// =============================================================================

/**
 * Export graph inspection data as structured log entries.
 *
 * Delegates to toStructuredLogs from @hex-di/graph/advanced.
 */
function exportStructuredLogs(inspection: GraphInspection, options?: StructuredLogOptions): string {
  const logs = toStructuredLogs(inspection, options);
  return logs.map(entry => JSON.stringify(entry)).join("\n");
}

// =============================================================================
// URL State Encoding
// =============================================================================

/**
 * Encode graph panel state as a URL search string.
 *
 * Used for "Copy Link" sharing. Only encodes non-default values.
 */
function encodeGraphUrlState(params: {
  readonly containerName?: string;
  readonly selectedNodes?: ReadonlySet<string>;
  readonly direction?: "TB" | "LR";
  readonly filter?: GraphFilterState;
}): string {
  const searchParams = new URLSearchParams();

  if (params.containerName !== undefined) {
    searchParams.set("container", params.containerName);
  }

  if (params.selectedNodes !== undefined && params.selectedNodes.size > 0) {
    searchParams.set("selected", [...params.selectedNodes].join(","));
  }

  if (params.direction !== undefined && params.direction !== "TB") {
    searchParams.set("dir", params.direction);
  }

  if (params.filter !== undefined && params.filter.searchText !== "") {
    searchParams.set("search", params.filter.searchText);
  }

  return searchParams.toString();
}

/**
 * Decode graph panel state from a URL search string.
 */
function decodeGraphUrlState(search: string): {
  readonly containerName: string | undefined;
  readonly selectedNodes: ReadonlySet<string>;
  readonly direction: "TB" | "LR";
  readonly searchText: string;
} {
  const params = new URLSearchParams(search);

  const containerName = params.get("container") ?? undefined;

  const selectedRaw = params.get("selected");
  const selectedNodes: ReadonlySet<string> =
    selectedRaw !== null ? new Set(selectedRaw.split(",").filter(Boolean)) : new Set();

  const dirRaw = params.get("dir");
  const direction: "TB" | "LR" = dirRaw === "LR" ? "LR" : "TB";

  const searchText = params.get("search") ?? "";

  return { containerName, selectedNodes, direction, searchText };
}

// =============================================================================
// Helpers
// =============================================================================

function getLifetimeDotColor(lifetime: string): string {
  switch (lifetime) {
    case "singleton":
      return "#6366f1";
    case "scoped":
      return "#22c55e";
    case "transient":
      return "#f59e0b";
    default:
      return "#9ca3af";
  }
}

export {
  exportDot,
  buildSubgraphDot,
  exportMermaid,
  exportSvg,
  exportPng,
  exportInspectionJson,
  exportStructuredLogs,
  encodeGraphUrlState,
  decodeGraphUrlState,
  sanitizeMermaidId,
};
