#!/usr/bin/env node

/**
 * Fix script v2 - Final cleanup pass for ADR-016 migration
 * 1. Fix Desktop App mermaid diagrams: replace remaining specforge commands with GUI verbs
 * 2. Fix missing blank lines before sections
 * 3. Fix broken abbreviations in Use Case text
 */

import fs from 'fs';
import path from 'path';

const CAPS_DIR = 'spec/specforge/capabilities';

const TIER_A = ['040', '076', '078', '080', '082'];
const TIER_B = ['005', '009', '012', '018', '019', '023', '027', '047', '054', '060', '065', '067', '071', '073', '075', '084', '086'];
const TIER_C = ['001', '002', '003', '008', '010', '013', '014', '015', '016', '017', '020', '025', '026', '028', '029', '036', '037', '038', '042', '044', '045', '046', '048', '053', '056', '057', '058', '059', '061', '062', '063'];
const TIER_D = ['064', '066', '068', '074', '090'];
const TIER_E = ['006', '021', '022', '030', '031', '032', '033', '034', '035', '041', '043', '055', '069', '070', '072'];
const TIER_F = ['004', '011', '024', '077', '079', '081', '083', '085', '087', '088', '089', '091'];
const TIER_G = ['007', '039', '049', '050', '051', '052'];

function getTier(id) {
  const num = id.replace('UX-SF-', '');
  if (TIER_A.includes(num)) return 'A';
  if (TIER_B.includes(num)) return 'B';
  if (TIER_C.includes(num)) return 'C';
  if (TIER_D.includes(num)) return 'D';
  if (TIER_E.includes(num)) return 'E';
  if (TIER_F.includes(num)) return 'F';
  if (TIER_G.includes(num)) return 'G';
  return null;
}

// ─── Panel-specific GUI action mappings ─────────────────────────────────────
// Maps specforge CLI commands to desktop GUI actions for each capability
const GUI_ACTION_MAP = {
  '001': ['Open Flow Launcher \u2192 Select "spec-verify"', 'Click "Run"'],
  '002': ['Open Flow Launcher \u2192 Select flow', 'Select preset from dropdown', 'Click "Run"'],
  '003': ['Open Flow Launcher \u2192 Select flow', 'Click "Estimate Cost"'],
  '005': ['Open Flow Control \u2192 Select flow', 'Click "Pause"', 'Click "Resume"'],
  '008': ['Open Flow Registry \u2192 Click "Register"', 'Upload definition', 'Click "Save"'],
  '009': ['Open Graph Explorer \u2192 Enter query', 'Click "Search"'],
  '010': ['Open Graph Explorer \u2192 Select template', 'Click "Run"'],
  '012': ['Open Graph Explorer \u2192 Enter Cypher', 'Click "Execute"'],
  '013': ['Open Import/Export \u2192 Select "Import Markdown"', 'Browse for file', 'Click "Import"'],
  '014': ['Open Import/Export \u2192 Select "Import OpenAPI"', 'Browse for file', 'Click "Import"'],
  '015': ['Open Import/Export \u2192 Select "Export"', 'Choose format \u2192 Select nodes', 'Click "Export"'],
  '016': ['Open Import/Export \u2192 Click "Register Adapter"', 'Configure adapter', 'Click "Save"'],
  '017': ['Open Flow Control \u2192 Select flow', 'Click "Inject Feedback"', 'Enter feedback \u2192 Click "Submit"'],
  '018': ['Open Approval Queue \u2192 Select transition', 'Review outputs', 'Click "Approve" / "Reject"'],
  '019': ['Open Approval Queue \u2192 Select request', 'Enter response', 'Click "Submit"'],
  '020': ['Open Flow Control \u2192 Select flow', 'Click "Force Convergence" / "Add Iteration"'],
  '023': ['Open Approval Queue \u2192 Select change', 'Review diff', 'Click "Approve" / "Reject"'],
  '025': ['Open Flow Control \u2192 Select flow', 'Click "Transfer Ownership"', 'Select owner \u2192 Click "Confirm"'],
  '026': ['Open Agent Backends \u2192 Click "Register"', 'Configure connection', 'Click "Save"'],
  '027': ['Open Agent Backends \u2192 View health', 'Select backend for details'],
  '028': ['Open MCP Configuration \u2192 Select role', 'Add/remove servers', 'Click "Save"'],
  '029': ['Open Agent Roles \u2192 Click "Create"', 'Select template \u2192 Customize', 'Click "Save"'],
  '036': ['Open Project Setup \u2192 Click "New"', 'Configure settings', 'Click "Initialize"'],
  '037': ['Open Deployment Settings', 'Select mode \u2192 Configure', 'Click "Apply"'],
  '038': ['Open Budget Settings', 'Set token limits per role/flow', 'Click "Save"'],
  '040': ['Open Notification Settings', 'Configure event filters', 'Set delivery channels', 'Click "Test"'],
  '042': ['Open Model Routing \u2192 Select role', 'Assign model tier', 'Click "Save"'],
  '044': ['Open Plugin Manager \u2192 Browse available', 'Click "Install"', 'Confirm installation'],
  '045': ['Open Plugin Manager', 'Toggle enable/disable', 'Click "Configure" \u2192 Adjust'],
  '046': ['Open Plugin Manager \u2192 Select plugin', 'Click "Register Flows"'],
  '047': ['Open Agent Marketplace \u2192 Search', 'View details', 'Click "Install"'],
  '048': ['Open Agent Marketplace \u2192 Click "Publish"', 'Select pack \u2192 Configure', 'Click "Submit"'],
  '053': ['Open Compliance Settings', 'Toggle "GxP Mode"', 'Configure audit level \u2192 Click "Activate"'],
  '054': ['Open Compliance Reports \u2192 Select type', 'Set date range', 'Click "Generate"'],
  '056': ['Open Compliance Packs \u2192 Browse', 'Click "Install"', 'Configure \u2192 Click "Activate"'],
  '057': ['Open Validation Protocols', 'Select protocol (IQ/OQ/PQ)', 'Click "Run"'],
  '058': ['Open Access Matrix \u2192 Select role', 'Toggle permissions', 'Click "Save"'],
  '059': ['Open Permission Preview \u2192 Select role', 'Click "Preview"'],
  '060': ['Open Approval Queue \u2192 Select request', 'Review scope', 'Click "Grant" / "Deny"'],
  '061': ['Open Tool Isolation \u2192 Select role', 'Configure allowed tools', 'Click "Save"'],
  '062': ['Open Memory Manager', 'View generated CLAUDE.md', 'Edit sections \u2192 Click "Save"'],
  '063': ['Open Memory Manager \u2192 Select version', 'Click "Diff"', 'Select comparison version'],
  '064': ['Open Memory Manager \u2192 Click "Transfer"', 'Select target project', 'Choose patterns \u2192 Click "Apply"'],
  '065': ['Open Structured Logs', 'Filter by correlation ID', 'Select entry \u2192 View context'],
  '066': ['Open Trace Export', 'Select export target', 'Configure format \u2192 Click "Export"'],
  '067': ['Open System Health', 'View service status', 'Select component for details'],
  '068': ['Open Auth & Tokens', 'Click "Log In" / "Generate Token"', 'Configure scope \u2192 Click "Create"'],
  '071': ['Open Graph Pipeline', 'Configure mutation validators', 'Set ordering \u2192 Click "Save"'],
  '073': ['Open Project Lifecycle \u2192 View state', 'Click "Transition"', 'Select target \u2192 Click "Confirm"'],
  '074': ['Open Plugin Manager \u2192 Settings', 'Configure lazy loading', 'Click "Save"'],
  '075': ['Open Permission Boundaries', 'Define scope \u2192 Set rules', 'Click "Save"'],
  '076': ['Open Notification Settings', 'Add classification rule', 'Add routing rule \u2192 Click "Save"'],
  '078': ['Open Skill Editor \u2192 Click "New Skill"', 'Define skill', 'Click "Save"'],
  '080': ['Open Workflow Builder', 'Drag skills into sequence', 'Configure connections \u2192 Click "Save"'],
  '082': ['Open Workflow Runner \u2192 Select workflow', 'Click "Run"', 'Monitor execution'],
  '084': ['Open Output Schemas \u2192 Select role', 'Define JSON schema', 'Click "Save"'],
  '086': ['Open Integrations \u2192 Click "Connect"', 'Select service \u2192 Authorize', 'Click "Save"'],
  '090': ['Open Maintenance Settings', 'Configure auto-update rules', 'Set schedules \u2192 Click "Save"'],
};

// ─── Fix 1: Desktop App mermaid - replace specforge commands with GUI verbs ─

function fixDesktopMermaidActions(content, idNum) {
  const guiActions = GUI_ACTION_MAP[idNum];
  if (!guiActions) return content; // No mapping needed

  // Find the Desktop App subsection
  const desktopHeader = '### Desktop App';
  const desktopStart = content.indexOf(desktopHeader);
  if (desktopStart === -1) return content;

  const cliHeader = '### CLI';
  const cliStart = content.indexOf(cliHeader, desktopStart);
  const nextSection = content.indexOf('\n## ', desktopStart + desktopHeader.length);
  const desktopEnd = cliStart !== -1 ? cliStart : (nextSection !== -1 ? nextSection : content.length);

  let desktopSection = content.slice(desktopStart, desktopEnd);

  // Fix mermaid blocks within Desktop App section
  desktopSection = desktopSection.replace(/```mermaid\n([\s\S]*?)```/g, (match, mermaidContent) => {
    if (!mermaidContent.includes('sequenceDiagram')) return match;

    let fixed = mermaidContent;

    // Replace ALL specforge commands in user action lines
    let actionIdx = 0;
    fixed = fixed.replace(/(Dev->>[\+\-]?DesktopApp:\s*)(specforge[^\n]+)/g, (m, prefix, cmd) => {
      const action = guiActions[actionIdx] || `Configure settings (step ${actionIdx + 1})`;
      actionIdx++;
      return prefix + action;
    });

    return '```mermaid\n' + fixed + '```';
  });

  // Also fix ASCII blocks - replace specforge commands
  desktopSection = desktopSection.replace(/```text\n([\s\S]*?)```/g, (match, asciiContent) => {
    let fixed = asciiContent;
    let actionIdx = 0;

    // Replace specforge commands in user action labels
    fixed = fixed.replace(/│\s*(specforge\s+[^\n│]*)/g, (m, cmd) => {
      const action = guiActions[actionIdx] || `Step ${actionIdx + 1}`;
      actionIdx++;
      // Truncate to fit ASCII art width
      const truncated = action.length > 12 ? action.slice(0, 12) : action;
      return '\u2502 ' + truncated;
    });

    return '```text\n' + fixed + '```';
  });

  return content.slice(0, desktopStart) + desktopSection + content.slice(desktopEnd);
}

// ─── Fix 2: Broken abbreviations in Use Case ───────────────────────────────

function fixBrokenAbbreviations(content) {
  // Common patterns from broken sentence splitting at abbreviations
  const fixes = [
    // "built. g.," -> "built-in flows (e.g.,"  -- too complex to reconstruct
    // Instead, fix common broken patterns
    [/the built\. g\.,/g, 'the built-in flows (e.g.,'],
    [/the built\. g\./g, 'the built-in flows (e.g.'],
    [/runs side\./g, 'runs side-by-side.'],
    [/node\. g\.,/g, 'node (e.g.,'],
    [/role\. g\.,/g, 'role (e.g.,'],
    [/type\. g\.,/g, 'type (e.g.,'],
    [/file\. g\.,/g, 'file (e.g.,'],
    [/format\. g\.,/g, 'format (e.g.,'],
    [/tool\. g\.,/g, 'tool (e.g.,'],
    [/event\. g\.,/g, 'event (e.g.,'],
    [/query\. g\.,/g, 'query (e.g.,'],
    [/mode\. g\.,/g, 'mode (e.g.,'],
    [/state\. g\.,/g, 'state (e.g.,'],
    [/backend\. g\.,/g, 'backend (e.g.,'],
    [/server\. g\.,/g, 'server (e.g.,'],
    [/command\. g\.,/g, 'command (e.g.,'],
    [/(\w+)\. g\., /g, '$1 (e.g., '],
    [/(\w+)\. g\./g, '$1 (e.g.'],
    // "i.e." breakage
    [/(\w+)\. e\.,/g, '$1 (i.e.,'],
    // Fix "etc." breakage
    [/(\w+)\. tc\./g, '$1 etc.'],
  ];

  // Only apply to Use Case section
  const useCaseStart = content.indexOf('## Use Case');
  if (useCaseStart === -1) return content;

  const nextSection = content.indexOf('\n## ', useCaseStart + 11);
  if (nextSection === -1) return content;

  let useCaseSection = content.slice(useCaseStart, nextSection);

  for (const [pattern, replacement] of fixes) {
    useCaseSection = useCaseSection.replace(pattern, replacement);
  }

  return content.slice(0, useCaseStart) + useCaseSection + content.slice(nextSection);
}

// ─── Fix 3: Ensure blank line before ## sections ────────────────────────────

function fixBlankLines(content) {
  // Ensure there's a blank line before every ## heading
  content = content.replace(/([^\n])\n(## )/g, '$1\n\n$2');
  // Ensure there's a blank line before ### headings
  content = content.replace(/([^\n])\n(### )/g, '$1\n\n$2');
  // Remove triple+ blank lines
  content = content.replace(/\n{3,}/g, '\n\n');
  return content;
}

// ─── Fix 4: Ensure ASCII art user actions are meaningful ────────────────────

function fixAsciiUserActions(content, idNum) {
  // The ASCII art for Desktop App section should have GUI-style user actions
  // instead of "run spec-verify" etc.
  const panel = {
    '001': 'Flow Launcher',
    '002': 'Flow Launcher',
    '003': 'Flow Launcher',
    '005': 'Flow Control',
    '008': 'Flow Registry',
    '009': 'Graph Explorer',
    '010': 'Graph Explorer',
    '012': 'Graph Explorer',
    '013': 'Import/Export',
    '014': 'Import/Export',
    '015': 'Import/Export',
    '016': 'Import/Export',
    '017': 'Flow Control',
    '018': 'Approval Queue',
    '019': 'Approval Queue',
    '020': 'Flow Control',
    '023': 'Approval Queue',
    '025': 'Flow Control',
    '026': 'Agent Backends',
    '027': 'Agent Backends',
    '028': 'MCP Config',
    '029': 'Agent Roles',
    '036': 'Project Setup',
    '037': 'Deploy Settings',
    '038': 'Budget Settings',
    '040': 'Notif Settings',
    '042': 'Model Routing',
    '044': 'Plugin Manager',
    '045': 'Plugin Manager',
    '046': 'Plugin Manager',
    '047': 'Marketplace',
    '048': 'Marketplace',
    '053': 'Compliance',
    '054': 'Compliance',
    '056': 'Compliance',
    '057': 'Validation',
    '058': 'Access Matrix',
    '059': 'Permissions',
    '060': 'Approval Queue',
    '061': 'Tool Isolation',
    '062': 'Memory Mgr',
    '063': 'Memory Mgr',
    '064': 'Memory Mgr',
    '065': 'Struct. Logs',
    '066': 'Trace Export',
    '067': 'System Health',
    '068': 'Auth & Tokens',
    '071': 'Graph Pipeline',
    '073': 'Proj Lifecycle',
    '074': 'Plugin Manager',
    '075': 'Permissions',
    '076': 'Notif Settings',
    '078': 'Skill Editor',
    '080': 'Workflow Bldr',
    '082': 'Workflow Runner',
    '084': 'Output Schemas',
    '086': 'Integrations',
    '090': 'Maintenance',
  }[idNum];

  if (!panel) return content;

  // In the Desktop App ASCII section, replace "Open <panel>" shorthand labels
  // Just ensure the first user action says "Open <panel>" in some form
  const desktopStart = content.indexOf('### Desktop App');
  if (desktopStart === -1) return content;

  const cliStart = content.indexOf('### CLI', desktopStart);
  if (cliStart === -1) return content;

  let desktopSection = content.slice(desktopStart, cliStart);

  // Replace generic "run" or "Open Flow Launcher" labels that may be too long/short
  // This is a best-effort fix for ASCII art labels
  desktopSection = desktopSection.replace(
    /│ Open Flow Launcher([ │])/g,
    `\u2502 Open ${panel.padEnd(14)}$1`
  );

  return content.slice(0, desktopStart) + desktopSection + content.slice(cliStart);
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('ADR-016 Desktop-First Migration - Fix v2\n');

  const files = fs.readdirSync(CAPS_DIR)
    .filter(f => f.match(/^UX-SF-\d+/))
    .sort();

  let fixed = 0;
  for (const file of files) {
    const filePath = path.join(CAPS_DIR, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    const idMatch = content.match(/id:\s*UX-SF-(\d+)/);
    if (!idMatch) continue;

    const idNum = idMatch[1];
    const tier = getTier(`UX-SF-${idNum}`);
    if (!tier || tier === 'G') continue;

    console.log(`  Fixing ${idNum} (Tier ${tier})`);

    // Fix broken abbreviations in Use Case
    content = fixBrokenAbbreviations(content);

    // Fix Desktop App mermaid actions (Tiers A-D only)
    if (['A', 'B', 'C', 'D'].includes(tier)) {
      content = fixDesktopMermaidActions(content, idNum);
    }

    // Fix blank lines
    content = fixBlankLines(content);

    fs.writeFileSync(filePath, content);
    fixed++;
  }

  console.log(`\nFixed: ${fixed} files`);
}

main();
