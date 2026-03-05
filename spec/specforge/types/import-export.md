---
id: TYPE-SF-013
kind: types
title: Import / Export Types
status: active
domain: import-export
behaviors: []
adrs: []
---

# Import / Export Types

- [architecture/ports-and-adapters.md](../architecture/ports-and-adapters.md) -- ImportAdapterPort and ExportAdapterPort in universal ports
- [behaviors/BEH-SF-127-import-export.md](../behaviors/BEH-SF-127-import-export.md) -- import/export behavioral contracts
- [types/errors.md](./errors.md) -- `ImportError`, `ExportError`, `ImportFormatNotSupportedError`, `ExportFormatNotSupportedError`

---

## Import Types

```typescript
type ImportFormat = "markdown" | "openapi" | string;

interface ImportInput {
  readonly format: ImportFormat;
  readonly path: string;
  readonly options?: ImportOptions;
}

interface ImportOptions {
  readonly dryRun?: boolean;
  readonly force?: boolean;
  readonly incremental?: boolean;
}

interface ImportResult {
  readonly format: ImportFormat;
  readonly filesProcessed: number;
  readonly filesSkipped: number;
  readonly nodesCreated: number;
  readonly nodesUpdated: number;
  readonly errors: ReadonlyArray<ImportFileError>;
}

interface ImportFileError {
  readonly filePath: string;
  readonly message: string;
  readonly line?: number;
}

interface ImportContentHash {
  readonly filePath: string;
  readonly hash: string;
  readonly importedAt: string;
}
```

---

## Export Types

```typescript
type ExportFormat = "markdown" | "adr" | "coverage-report" | string;

interface ExportData {
  readonly specIds?: ReadonlyArray<string>;
  readonly format: ExportFormat;
  readonly outputPath: string;
  readonly options?: ExportOptions;
}

interface ExportOptions {
  readonly overwrite?: boolean;
  readonly includeTraceability?: boolean;
}

interface ExportResult {
  readonly format: ExportFormat;
  readonly filesWritten: number;
  readonly totalSize: number;
  readonly outputPath: string;
}
```

---

## Import Adapter Port

```typescript
interface ImportAdapterService {
  readonly parse: (input: ImportInput) => ResultAsync<ImportResult, ImportError>;
  readonly supports: (format: string) => boolean;
  readonly name: string;
}
```

---

## Export Adapter Port

```typescript
interface ExportAdapterService {
  readonly render: (data: ExportData) => ResultAsync<ExportResult, ExportError>;
  readonly supports: (format: string) => boolean;
  readonly name: string;
}
```

---

## Registry Types

```typescript
interface ImportRegistryService {
  readonly register: (adapter: ImportAdapterService) => void;
  readonly resolve: (format: string) => ImportAdapterService | undefined;
  readonly listFormats: () => ReadonlyArray<string>;
}

interface ExportRegistryService {
  readonly register: (adapter: ExportAdapterService) => void;
  readonly resolve: (format: string) => ExportAdapterService | undefined;
  readonly listFormats: () => ReadonlyArray<string>;
}
```
