#!/usr/bin/env node
/**
 * Script to fix test imports after core package migration.
 * Moves adapter-related imports from graph to @hex-di/core.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Exports that stay in graph package
const GRAPH_EXPORTS = new Set([
  'GraphBuilder',
  'GRAPH_BUILDER_BRAND',
  'GraphBuilderFactory',
  'Graph',
  'isGraphBuilder',
  'isGraph',
  'InferGraphProvides',
  'InferGraphRequires',
  'InferGraphAsyncPorts',
  'InferGraphOverrides',
  '__prettyViewSymbol',
  // From advanced
  'inspectGraph',
  'CaptiveDependencyResult',
  'ComplexityBreakdown',
  'INSPECTION_CONFIG',
  'InspectOptions',
  'DependencyMap',
  'toStructuredLogs',
  'MissingDependencyError',
  'DuplicateProviderError',
  'CircularDependencyError',
  'CaptiveDependencyError',
  '__emptyDepGraphBrand',
  '__emptyLifetimeMapBrand',
  'EmptyDependencyGraph',
  'EmptyLifetimeMap',
]);

// Exports that should come from @hex-di/core
const CORE_EXPORTS = new Set([
  'createAdapter',
  'createAsyncAdapter',
  'Adapter',
  'AdapterConstraint',
  'Lifetime',
  'FactoryKind',
  'ResolvedDeps',
  'EmptyDeps',
  'lazyPort',
  'isLazyPort',
  'getOriginalPort',
  'LazyPort',
  'isAdapter',
  'isLifetime',
  'isFactoryKind',
  'InferAdapterProvides',
  'InferAdapterRequires',
  'InferAdapterLifetime',
  'InferManyProvides',
  'InferManyRequires',
  'defineService',
  'defineAsyncService',
  'createClassAdapter',
  'Port',
  'InferService',
  'InferPortName',
  'createPort',
  'port',
  'SYNC',
  'ASYNC',
  'SINGLETON',
  'SCOPED',
  'TRANSIENT',
  'InferClonable',
  'IsClonableAdapter',
]);

function getAllFiles(dir, ext = '.ts') {
  const files = [];

  function walk(currentDir) {
    const items = readdirSync(currentDir);
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (item.endsWith(ext) || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function parseImport(importLine) {
  // Match: import { A, B, type C } from "path";
  const match = importLine.match(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/);
  if (!match) return null;

  const imports = match[1].split(',').map(s => s.trim()).filter(Boolean);
  const path = match[2];

  return { imports, path, original: importLine };
}

function categorizeImports(imports) {
  const graphImports = [];
  const coreImports = [];
  const unknownImports = [];

  for (const imp of imports) {
    // Remove 'type ' prefix for checking
    const cleanImp = imp.replace(/^type\s+/, '');

    if (GRAPH_EXPORTS.has(cleanImp)) {
      graphImports.push(imp);
    } else if (CORE_EXPORTS.has(cleanImp)) {
      coreImports.push(imp);
    } else {
      // Check if it's a known graph thing by prefix
      if (cleanImp.startsWith('InferGraph') || cleanImp.startsWith('Graph')) {
        graphImports.push(imp);
      } else {
        // Default to core for adapter-related things
        coreImports.push(imp);
      }
    }
  }

  return { graphImports, coreImports, unknownImports };
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;

  // Find imports from local graph source
  const localImportRegex = /import\s*\{[^}]+\}\s*from\s*["'](\.\.?\/src\/[^"']+|\.\.\/\.\.\/src\/[^"']+)["'];?\n?/g;

  const imports = [];
  let match;
  while ((match = localImportRegex.exec(content)) !== null) {
    const parsed = parseImport(match[0]);
    if (parsed) {
      imports.push({ ...parsed, fullMatch: match[0] });
    }
  }

  if (imports.length === 0) return false;

  for (const imp of imports) {
    const { graphImports, coreImports } = categorizeImports(imp.imports);

    // If there are core imports, we need to modify
    if (coreImports.length > 0) {
      modified = true;

      let replacement = '';

      // Add core import if needed
      if (coreImports.length > 0) {
        // Check if there's already an @hex-di/core import to merge with
        const existingCoreMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*["']@hex-di\/core["'];?\n?/);
        if (existingCoreMatch) {
          // Merge with existing
          const existingImports = existingCoreMatch[1].split(',').map(s => s.trim()).filter(Boolean);
          const allCoreImports = [...new Set([...existingImports, ...coreImports])];
          const newCoreImport = `import { ${allCoreImports.join(', ')} } from "@hex-di/core";\n`;
          content = content.replace(existingCoreMatch[0], newCoreImport);
        } else {
          replacement += `import { ${coreImports.join(', ')} } from "@hex-di/core";\n`;
        }
      }

      // Add graph import if needed
      if (graphImports.length > 0) {
        replacement += `import { ${graphImports.join(', ')} } from "${imp.path}";\n`;
      }

      // Replace the original import
      content = content.replace(imp.fullMatch, replacement);
    }
  }

  if (modified) {
    // Clean up duplicate newlines
    content = content.replace(/\n{3,}/g, '\n\n');
    writeFileSync(filePath, content);
    return true;
  }

  return false;
}

// Main
const testsDir = join(process.cwd(), 'tests');
const files = getAllFiles(testsDir);

let fixedCount = 0;
for (const file of files) {
  try {
    if (processFile(file)) {
      console.log(`Fixed: ${file}`);
      fixedCount++;
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
}

console.log(`\nTotal files fixed: ${fixedCount}`);
