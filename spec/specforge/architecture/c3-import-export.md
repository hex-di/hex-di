---
id: ARCH-SF-011
kind: architecture
title: C3 — Import / Export
status: active
c4_level: L3
---

# C3 — Import / Export

**Level:** C3 (Component)
**Scope:** Internal components of the pluggable import/export adapter pipeline
**Parent:** [c3-server.md](./c3-server.md) — SpecForge Server

---

## Overview

The Import/Export subsystem provides a pluggable pipeline for ingesting external specifications into the knowledge graph and rendering graph data to external formats. Built-in adapters handle Markdown and OpenAPI import, plus Markdown/ADR/Coverage-Report export. The adapter registry pattern enables third-party format plugins (Jira, Confluence, AsciiDoc, Gherkin). Incremental import uses content hashing to skip unchanged files, and round-trip validation ensures export faithfulness.

---

## Component Diagram

```mermaid
C4Component
    title Component Diagram for Import / Export

    Container_Boundary(ie, "Import / Export Pipeline") {
        Component(formatRegistry, "FormatAdapterRegistry", "TypeScript", "Central registry for import and export adapters. Resolves adapters by format name. Lists supported formats.")
        Component(markdownAdapter, "MarkdownAdapter", "TypeScript", "Parses Markdown spec files into graph nodes. Extracts headings, requirement patterns, code blocks. Renders graph data back to Markdown.")
        Component(openapiAdapter, "OpenAPIAdapter", "TypeScript", "Parses OpenAPI 3.0/3.1 specs (JSON/YAML). Creates Requirement nodes per endpoint with method, path, schemas, constraints.")
        Component(transformPipeline, "TransformationPipeline", "TypeScript", "Orchestrates parse -> validate -> deduplicate -> write flow. Handles incremental detection via content hashing.")
        Component(roundTripValidator, "RoundTripValidator", "TypeScript", "Validates export faithfulness by comparing rendered output against source graph data. Detects information loss.")
    }

    Container_Boundary(ext, "External Components") {
        Component(graphStore, "GraphStorePort", "", "Reads/writes SpecFile and Requirement nodes")
        Component(templatePort, "TemplatePort", "", "Renders graph data to output formats")
        Component(cli, "CLI CommandRouter", "", "Routes specforge import/export commands")
    }

    Rel(cli, transformPipeline, "Invokes import/export with format and path")
    Rel(transformPipeline, formatRegistry, "Resolves adapter by format name")
    Rel(formatRegistry, markdownAdapter, "Routes markdown format requests")
    Rel(formatRegistry, openapiAdapter, "Routes openapi format requests")
    Rel(markdownAdapter, graphStore, "Creates/updates SpecFile and Requirement nodes")
    Rel(openapiAdapter, graphStore, "Creates Requirement nodes per endpoint")
    Rel(transformPipeline, graphStore, "Reads content hashes for incremental detection")
    Rel(transformPipeline, roundTripValidator, "Validates export round-trip fidelity")
    Rel(markdownAdapter, templatePort, "Uses templates for export rendering")
```

---

## Component Descriptions

| Component                  | Responsibility                                                                                                                                                                                                                                                                                | Key Interfaces                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **FormatAdapterRegistry**  | Central registry for `ImportAdapterService` and `ExportAdapterService` implementations. Resolves by format name. Returns `ImportFormatNotSupportedError` or `ExportFormatNotSupportedError` for unknown formats. Plugins register additional adapters at startup.                             | `register(adapter)`, `resolve(format)`, `listFormats()`                |
| **MarkdownAdapter**        | Import: parses Markdown files, extracts heading structure as sections, detects requirement patterns (`REQ-*`, `MUST`, `SHALL`), identifies code blocks. Export: renders graph data as Markdown using `TemplatePort`. Supports `--dry-run` and `--force` flags.                                | `parse(input)`, `render(data)`, `supports('markdown')`                 |
| **OpenAPIAdapter**         | Import: parses OpenAPI 3.0 and 3.1 specs (JSON and YAML). Creates a `Requirement` node per endpoint with HTTP method, path, summary, request/response schemas, and validation constraints.                                                                                                    | `parse(input)`, `supports('openapi')`                                  |
| **TransformationPipeline** | Orchestrates the full import/export flow. Import: parse -> validate -> compute content hash -> skip if unchanged -> deduplicate -> write to graph. Export: query graph -> filter by spec -> render via adapter -> validate round-trip. Handles `--dry-run`, `--force`, `--incremental` flags. | `import(format, path, options)`, `export(format, outputPath, options)` |
| **RoundTripValidator**     | Validates that exported files faithfully represent the source graph data. Compares node counts, requirement IDs, section structure. Reports discrepancies as warnings. Used for CI drift detection.                                                                                           | `validate(exported, source)`                                           |

---

## Relationships to Parent Components

| From                   | To                     | Relationship                                          |
| ---------------------- | ---------------------- | ----------------------------------------------------- |
| CLI CommandRouter      | TransformationPipeline | Routes `specforge import`/`specforge export` commands |
| TransformationPipeline | FormatAdapterRegistry  | Resolves import/export adapter by format name         |
| MarkdownAdapter        | GraphStorePort         | Creates/updates SpecFile and Requirement graph nodes  |
| OpenAPIAdapter         | GraphStorePort         | Creates Requirement nodes per API endpoint            |
| MarkdownAdapter        | TemplatePort           | Uses rendering templates for Markdown export          |

---

## Import/Export Data Flow

**Import pipeline:**

```
File input → ImportRegistryPort.resolve(format)
    → ImportAdapterService.parse(input)
    → ParsedImport
    → GraphMutationService.createNode() (per entry)
    → GraphSyncService.syncArtifacts()
```

**Export pipeline:**

```
ExportRegistryPort.resolve(format)
    → GraphQueryService.query() (gather data)
    → ExportAdapterService.render(data)
    → ExportResult (file output)
```

---

## References

- [Import/Export Behaviors](../behaviors/BEH-SF-127-import-export.md) — BEH-SF-127 through BEH-SF-132
- [Import/Export Types](../types/import-export.md) — ImportInput, ImportResult, ExportData, ExportResult, ImportAdapterService, ExportAdapterService
- [Ports and Adapters](./ports-and-adapters.md) — ImportAdapterPort, ExportAdapterPort in universal ports
