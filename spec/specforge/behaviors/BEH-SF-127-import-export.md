---
id: BEH-SF-127
kind: behavior
title: Import / Export
status: active
id_range: 127--132
invariants: [INV-SF-7]
adrs: [ADR-005]
types: [import-export, import-export]
ports: [ImportAdapterPort, ExportAdapterPort, ImportRegistryPort, ExportRegistryPort]
---

# 18 — Import / Export

## BEH-SF-127: Markdown Import — `specforge import markdown <path>` Parses Existing Specs into Graph

The `specforge import markdown` command parses existing markdown specification files and creates corresponding graph nodes (SpecFile, Requirement, etc.) in the knowledge graph.

### Contract

REQUIREMENT (BEH-SF-127): `specforge import markdown <path>` MUST parse the markdown file(s) at the given path (file or directory). For each file, the system MUST create a `SpecFile` node in the knowledge graph. The parser MUST extract headings as section structure, requirement-like patterns (e.g., `REQ-*`, `MUST`, `SHALL`) as `Requirement` nodes, and code blocks as implementation references. The command MUST output a summary of imported nodes. `--dry-run` MUST show what would be imported without writing to the graph.

### Verification

- File import test: import a single markdown file; verify a `SpecFile` node is created with section structure.
- Directory import test: import a directory; verify all `.md` files are processed.
- Requirement extraction test: import a file with `REQ-001` patterns; verify `Requirement` nodes are created.
- Dry run test: run with `--dry-run`; verify no graph mutations occur but the summary is displayed.
- Idempotency test: import the same file twice; verify no duplicate nodes are created.

---

## BEH-SF-128: OpenAPI Import — `specforge import openapi <path>` Creates Requirement Nodes for Endpoints

The `specforge import openapi` command parses an OpenAPI specification and creates requirement nodes for each endpoint, including method, path, request/response schemas, and validation constraints.

### Contract

REQUIREMENT (BEH-SF-128): `specforge import openapi <path>` MUST parse the OpenAPI spec (JSON or YAML). For each endpoint, the system MUST create a `Requirement` node with the HTTP method, path, summary, request body schema, response schemas, and validation constraints. Schema objects MUST be stored as properties on the requirement node. The command MUST support OpenAPI 3.0 and 3.1.

### Verification

- Endpoint import test: import an OpenAPI spec with 3 endpoints; verify 3 `Requirement` nodes are created.
- Schema test: verify request/response schemas are stored as properties on the requirement nodes.
- YAML test: import a YAML-format OpenAPI spec; verify parsing succeeds.
- JSON test: import a JSON-format OpenAPI spec; verify parsing succeeds.
- Version test: verify both OpenAPI 3.0 and 3.1 specs are accepted.

---

## BEH-SF-129: Markdown Export — `specforge export markdown <output-path>` Renders Graph to Markdown

The `specforge export markdown` command renders the knowledge graph data to markdown files using the existing rendering pipeline.

### Contract

REQUIREMENT (BEH-SF-129): `specforge export markdown <output-path>` MUST query the knowledge graph for all `SpecFile` and `Requirement` nodes and MUST render them as markdown files in the specified output directory. The rendering MUST use the existing `TemplatePort` rendering pipeline. `--spec <spec-id>` MUST filter export to a specific spec. `--format` MUST support `markdown` (default), `adr`, and `coverage-report`.

### Verification

- Full export test: export all specs; verify markdown files are created in the output directory.
- Content test: verify exported markdown contains requirement IDs, descriptions, and traceability links.
- Filter test: export with `--spec <id>`; verify only the specified spec is exported.
- Format test: export with `--format adr`; verify ADR-formatted output.
- Overwrite test: export to a directory with existing files; verify files are overwritten.

---

## BEH-SF-130: Import Adapter Extensibility — `ImportAdapterPort` for Pluggable Import Formats

The `ImportAdapterPort` interface enables pluggable import formats. New import formats (e.g., Jira, Confluence, AsciiDoc) can be added by implementing the adapter interface and registering with the import registry.

### Contract

REQUIREMENT (BEH-SF-130): The system MUST define an `ImportAdapterPort` interface with `parse(input: ImportInput): ResultAsync<ImportResult, ImportError>` and `supports(format: string): boolean` methods. Import adapters MUST be registerable via `ImportRegistryPort.register(adapter)`. `specforge import <format> <path>` MUST resolve the adapter by format name. If no adapter supports the format, the system MUST return an `ImportFormatNotSupportedError`.

### Verification

- Registration test: register a custom import adapter; verify it is discoverable.
- Format resolution test: call `specforge import custom-format file.txt`; verify the custom adapter is invoked.
- Unsupported format test: call `specforge import unknown file.txt`; verify `ImportFormatNotSupportedError`.
- Interface test: verify the adapter receives `ImportInput` and returns `ImportResult`.

---

## BEH-SF-131: Export Adapter Extensibility — `ExportAdapterPort` for Pluggable Export Formats

The `ExportAdapterPort` interface enables pluggable export formats. New export formats can be added by implementing the adapter interface.

### Contract

REQUIREMENT (BEH-SF-131): The system MUST define an `ExportAdapterPort` interface with `render(data: ExportData): ResultAsync<ExportResult, ExportError>` and `supports(format: string): boolean` methods. Export adapters MUST be registerable via `ExportRegistryPort.register(adapter)`. `specforge export <format> <output-path>` MUST resolve the adapter by format name. If no adapter supports the format, the system MUST return an `ExportFormatNotSupportedError`.

### Verification

- Registration test: register a custom export adapter; verify it is discoverable.
- Format resolution test: call `specforge export custom-format ./output`; verify the custom adapter is invoked.
- Unsupported format test: call `specforge export unknown ./output`; verify `ExportFormatNotSupportedError`.
- Interface test: verify the adapter receives `ExportData` and returns `ExportResult`.

---

## BEH-SF-132: Incremental Import — Detect Changes Since Last Import, Update Only Modified Nodes

Incremental import detects changes since the last import and updates only modified graph nodes. Unchanged files are skipped, reducing graph write operations and preserving existing relationships.

### Contract

REQUIREMENT (BEH-SF-132): When `specforge import` is run on a previously imported source, the system MUST compute a content hash for each file and compare it against the stored hash from the previous import. Only files with changed hashes MUST be re-parsed and their graph nodes updated. Unchanged files MUST be skipped. Deleted source files MUST be flagged (but not automatically removed from the graph). `--force` MUST bypass incremental detection and re-import all files.

### Verification

- Incremental test: import files, modify one, re-import; verify only the modified file is re-processed.
- Skip test: import files, re-import without changes; verify no graph writes occur.
- Deleted file test: import files, delete one, re-import; verify the deleted file is flagged in the output.
- Force test: run with `--force`; verify all files are re-imported regardless of hash.
- Hash storage test: verify content hashes are stored as properties on `SpecFile` nodes.

---
