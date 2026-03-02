#!/usr/bin/env node

/**
 * Fix script for ADR-016 Desktop-First Migration
 * Repairs damage from the initial migration script:
 * 1. Cleans up mangled Use Case paragraphs (embedded mermaid/code content)
 * 2. Fixes Desktop App mermaid diagrams that still reference CLI
 * 3. Ensures proper file structure
 */

import fs from 'fs';
import path from 'path';

const CAPS_DIR = 'spec/specforge/capabilities';

// ─── Tier Assignments ───────────────────────────────────────────────────────

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

// ─── Panel Registry ─────────────────────────────────────────────────────────

const PANEL_REGISTRY = {
  '001': { panel: 'Flow Launcher' },
  '002': { panel: 'Flow Launcher' },
  '003': { panel: 'Flow Launcher' },
  '004': { panel: 'Flow Monitor' },
  '005': { panel: 'Flow Control' },
  '006': { panel: 'Flow History' },
  '008': { panel: 'Flow Registry' },
  '009': { panel: 'Graph Explorer' },
  '010': { panel: 'Graph Explorer' },
  '011': { panel: 'Graph Explorer' },
  '012': { panel: 'Graph Explorer' },
  '013': { panel: 'Import/Export' },
  '014': { panel: 'Import/Export' },
  '015': { panel: 'Import/Export' },
  '016': { panel: 'Import/Export' },
  '017': { panel: 'Flow Control' },
  '018': { panel: 'Approval Queue' },
  '019': { panel: 'Approval Queue' },
  '020': { panel: 'Flow Control' },
  '021': { panel: 'Shared Flows' },
  '022': { panel: 'Comments' },
  '023': { panel: 'Approval Queue' },
  '024': { panel: 'Project Switcher' },
  '025': { panel: 'Flow Control' },
  '026': { panel: 'Agent Backends' },
  '027': { panel: 'Agent Backends' },
  '028': { panel: 'MCP Configuration' },
  '029': { panel: 'Agent Roles' },
  '030': { panel: 'Session Inspector' },
  '031': { panel: 'Session Inspector' },
  '032': { panel: 'Session Inspector' },
  '033': { panel: 'Session Inspector' },
  '034': { panel: 'Session Inspector' },
  '035': { panel: 'Session Inspector' },
  '036': { panel: 'Project Setup' },
  '037': { panel: 'Deployment Settings' },
  '038': { panel: 'Budget Settings' },
  '040': { panel: 'Notification Settings' },
  '041': { panel: 'Cost Analytics' },
  '042': { panel: 'Model Routing' },
  '043': { panel: 'Escalation Events' },
  '044': { panel: 'Plugin Manager' },
  '045': { panel: 'Plugin Manager' },
  '046': { panel: 'Plugin Manager' },
  '047': { panel: 'Agent Marketplace' },
  '048': { panel: 'Agent Marketplace' },
  '053': { panel: 'Compliance Settings' },
  '054': { panel: 'Compliance Reports' },
  '055': { panel: 'Audit Trail' },
  '056': { panel: 'Compliance Packs' },
  '057': { panel: 'Validation Protocols' },
  '058': { panel: 'Access Matrix' },
  '059': { panel: 'Permission Preview' },
  '060': { panel: 'Approval Queue' },
  '061': { panel: 'Tool Isolation' },
  '062': { panel: 'Memory Manager' },
  '063': { panel: 'Memory Manager' },
  '064': { panel: 'Memory Manager' },
  '065': { panel: 'Structured Logs' },
  '066': { panel: 'Trace Export' },
  '067': { panel: 'System Health' },
  '068': { panel: 'Auth & Tokens' },
  '069': { panel: 'Organization Settings' },
  '070': { panel: 'Reactive Queries' },
  '071': { panel: 'Graph Pipeline' },
  '072': { panel: 'Conflict Resolver' },
  '073': { panel: 'Project Lifecycle' },
  '074': { panel: 'Plugin Manager' },
  '075': { panel: 'Permission Boundaries' },
  '076': { panel: 'Notification Settings' },
  '077': { panel: 'Skill Registry' },
  '078': { panel: 'Skill Editor' },
  '079': { panel: 'Skill Graph' },
  '080': { panel: 'Workflow Builder' },
  '081': { panel: 'Workflow Marketplace' },
  '082': { panel: 'Workflow Runner' },
  '083': { panel: 'Traceability Graph' },
  '084': { panel: 'Output Schemas' },
  '085': { panel: 'Streaming Monitor' },
  '086': { panel: 'Integrations' },
  '087': { panel: 'Integrations' },
  '088': { panel: 'Architecture Health' },
  '089': { panel: 'Drift Alerts' },
  '090': { panel: 'Maintenance Settings' },
  '091': { panel: 'Update Proposals' },
};

// ─── Use Case Persona Map ───────────────────────────────────────────────────

function personaArticle(persona) {
  const map = {
    'developer': 'A developer',
    'team-lead': 'A team lead',
    'admin': 'An admin',
    'devops': 'A devops engineer',
    'compliance-officer': 'A compliance officer',
  };
  return map[persona] || `A ${persona}`;
}

function getPersonaFromFrontmatter(content) {
  const match = content.match(/persona:\s*\[(.*?)\]/);
  if (!match) return 'developer';
  return match[1].split(',')[0].trim();
}

// ─── Use Case Fix ───────────────────────────────────────────────────────────

function cleanUseCaseParagraph(text) {
  // Remove any mermaid/code content that got embedded
  const lines = text.split('\n');
  const cleanLines = [];

  for (const line of lines) {
    // Skip lines that look like mermaid/code content
    if (line.match(/^\s*(actor|participant|Dev->>|CLI->>|Dash->>|DesktopApp->>|Engine--|Registry--|Store--|Config--|Notif--|Router--|Note over)/)) continue;
    if (line.match(/->>[\+\-]?/)) continue;
    if (line.match(/-->>[\+\-]?/)) continue;
    if (line.match(/^\s*```/)) continue;
    if (line.match(/^\s*sequenceDiagram/)) continue;
    if (line.match(/^\s*(loop|end|par|alt|opt|break|critical|rect)\b/)) continue;
    if (line.match(/^\s*\|.*\|.*\|/)) continue; // Table rows
    if (line.match(/^\s*##\s/)) continue; // Section headers that leaked in
    if (line.match(/^\s*\d+\.\s/)) continue; // Numbered list items that leaked in
    if (line.match(/^\s*┌|^\s*└|^\s*│|^\s*─/)) continue; // ASCII box drawing
    if (line.match(/^\s*(flowchart|stateDiagram|direction)/)) continue;
    if (line.match(/BEH-SF-\d+/)) continue; // Behavior references in leaked tables

    cleanLines.push(line);
  }

  let cleaned = cleanLines.join(' ').replace(/\s+/g, ' ').trim();

  // Remove trailing backtick-paren combinations from broken CLI note
  cleaned = cleaned.replace(/\(`specforge[^`]*$/, '').trim();
  cleaned = cleaned.replace(/`\)\s*for\s+scripted\/CI\s+workflows\.\s*$/, '').trim();

  // Remove any trailing incomplete sentences after the damage
  // Look for text after the last proper sentence ending
  const lastPeriod = cleaned.lastIndexOf('.');
  if (lastPeriod > 0 && lastPeriod < cleaned.length - 5) {
    const after = cleaned.slice(lastPeriod + 1).trim();
    // If what's after the last period looks like garbage, truncate
    if (after.match(/^\s*The same operation/) || after.match(/[│┌└─►◄]/)) {
      cleaned = cleaned.slice(0, lastPeriod + 1);
    }
  }

  return cleaned;
}

function extractCliCommandSafe(content) {
  // Only match specforge commands that appear in user-facing text (steps section)
  // NOT in mermaid diagrams. Match only on a single line.
  const stepsMatch = content.match(/## Steps[\s\S]*?(?=\n## |$)/);
  if (stepsMatch) {
    const cmd = stepsMatch[0].match(/`(specforge[ \t]+[^`\n]+)`/);
    if (cmd) return cmd[1].split(/\s*\(/)[0].trim(); // Remove trailing (BEH-...) refs
  }

  // Fallback: look for specforge command in Use Case original text (single line only)
  const useCaseCmd = content.match(/`(specforge[ \t]+[^`\n]+)`/);
  if (useCaseCmd) return useCaseCmd[1].split(/\s*\(/)[0].trim();

  return null;
}

function fixUseCase(content, tier, idNum) {
  const reg = PANEL_REGISTRY[idNum];
  if (!reg) return content;

  const persona = getPersonaFromFrontmatter(content);
  const panelName = reg.panel;
  const isDualSurface = ['A', 'B', 'C', 'D'].includes(tier);

  // Find the Use Case section
  const useCaseHeader = '## Use Case\n\n';
  const useCaseStart = content.indexOf(useCaseHeader);
  if (useCaseStart === -1) return content;

  const contentAfterHeader = content.slice(useCaseStart + useCaseHeader.length);

  // Find the next section (## Interaction Flow or similar)
  // Must be at line start
  const nextSectionMatch = contentAfterHeader.match(/\n## [A-Z]/);
  if (!nextSectionMatch) return content;

  const paragraphArea = contentAfterHeader.slice(0, nextSectionMatch.index);

  // Split into paragraphs (separated by blank lines)
  const paragraphs = paragraphArea.split(/\n\n+/).filter(p => p.trim().length > 0);

  // Clean each paragraph
  const cleanedParagraphs = paragraphs.map(p => cleanUseCaseParagraph(p)).filter(p => p.length > 0);

  if (cleanedParagraphs.length === 0) {
    // Fallback: generate a simple use case
    const personaText = personaArticle(persona);
    const title = content.match(/title:\s*"([^"]+)"/)?.[1] || '';
    let newUseCase = `${personaText} opens the ${panelName} in the desktop app to ${title.toLowerCase()}.`;
    if (isDualSurface) {
      const cliCmd = extractCliCommandSafe(content);
      if (cliCmd) {
        newUseCase += ` The same operation is accessible via CLI (\`${cliCmd}\`) for scripted/CI workflows.`;
      } else {
        newUseCase += ' The same operation is accessible via CLI for scripted/CI workflows.';
      }
    }
    const newContent = content.slice(0, useCaseStart) + useCaseHeader + newUseCase + contentAfterHeader.slice(nextSectionMatch.index);
    return newContent;
  }

  // Check if first paragraph already starts with desktop app mention
  let firstPara = cleanedParagraphs[0];
  const alreadyDesktop = firstPara.match(/opens the .+ in the desktop app/i);

  if (!alreadyDesktop) {
    // Need to rewrite first paragraph to lead with desktop
    const personaText = personaArticle(persona);
    const title = content.match(/title:\s*"([^"]+)"/)?.[1] || '';

    // Try to preserve original content after the first sentence
    const firstSentenceEnd = findFirstSentenceEnd(firstPara);
    const restOfPara = firstSentenceEnd >= 0 ? firstPara.slice(firstSentenceEnd + 1).trim() : '';

    firstPara = `${personaText} opens the ${panelName} in the desktop app to ${title.toLowerCase()}.`;
    if (restOfPara) {
      firstPara += ' ' + restOfPara;
    }
  }

  // Remove any lingering CLI note from the buggy first run
  firstPara = firstPara.replace(/\s*The same operation is accessible via CLI\s*\([^)]*\)\s*for scripted\/CI workflows\.\s*/g, '');
  firstPara = firstPara.replace(/\s*The same operation is accessible via CLI for scripted\/CI workflows\.\s*/g, '');

  // Add proper CLI note for dual-surface
  if (isDualSurface) {
    // Ensure the paragraph ends with a period
    if (!firstPara.endsWith('.')) firstPara += '.';

    const cliCmd = extractCliCommandSafe(content);
    if (cliCmd) {
      firstPara += ` The same operation is accessible via CLI (\`${cliCmd}\`) for scripted/CI workflows.`;
    } else {
      firstPara += ' The same operation is accessible via CLI for scripted/CI workflows.';
    }
  }

  // Reconstruct
  cleanedParagraphs[0] = firstPara;
  const newParagraphArea = cleanedParagraphs.join('\n\n');

  const newContent = content.slice(0, useCaseStart) + useCaseHeader + newParagraphArea + contentAfterHeader.slice(nextSectionMatch.index);
  return newContent;
}

function findFirstSentenceEnd(text) {
  // Find the end of the first sentence, handling abbreviations like e.g., i.e., etc.
  const abbrevs = ['e.g.', 'i.e.', 'etc.', 'vs.', 'Dr.', 'Mr.', 'Mrs.', 'Sr.', 'Jr.'];

  let i = 0;
  while (i < text.length) {
    if (text[i] === '.') {
      // Check if this is an abbreviation
      let isAbbrev = false;
      for (const abbrev of abbrevs) {
        const start = i - abbrev.length + 1;
        if (start >= 0 && text.slice(start, i + 1) === abbrev) {
          isAbbrev = true;
          break;
        }
      }

      // Check if next char is a space followed by uppercase (sentence boundary)
      if (!isAbbrev && i + 2 < text.length && text[i + 1] === ' ' && text[i + 2] >= 'A' && text[i + 2] <= 'Z') {
        return i;
      }

      // Check if next char is a space followed by "The", "This", "It", etc.
      if (!isAbbrev && i + 1 < text.length && (text[i + 1] === '\n' || i === text.length - 1)) {
        return i;
      }
    }
    i++;
  }

  // If no sentence end found, return -1
  return -1;
}

// ─── Mermaid Fix for Desktop App Diagrams ───────────────────────────────────

function fixDesktopMermaid(content, idNum) {
  const reg = PANEL_REGISTRY[idNum];
  if (!reg) return content;

  const panelName = reg.panel;

  // Find the Desktop App subsection
  const desktopHeader = '### Desktop App';
  const desktopStart = content.indexOf(desktopHeader);
  if (desktopStart === -1) return content;

  // Find the CLI subsection or next ## section
  const cliHeader = '### CLI';
  const cliStart = content.indexOf(cliHeader, desktopStart);
  const nextSection = content.indexOf('\n## ', desktopStart + desktopHeader.length);

  const desktopEnd = cliStart !== -1 ? cliStart : (nextSection !== -1 ? nextSection : content.length);
  const desktopSection = content.slice(desktopStart, desktopEnd);

  // Fix mermaid blocks within the Desktop App section
  const fixedSection = desktopSection.replace(/```mermaid\n([\s\S]*?)```/g, (match, mermaidContent) => {
    let fixed = mermaidContent;

    // Only fix sequence diagrams
    if (!fixed.includes('sequenceDiagram')) return match;

    // Replace participant CLI with Desktop App
    if (!fixed.includes('DesktopApp') && fixed.includes('participant CLI')) {
      fixed = fixed.replace(
        /participant\s+CLI\b/g,
        `participant DesktopApp as Desktop App (${panelName})`
      );
    }

    // Replace all CLI references with DesktopApp in message lines
    fixed = fixed.replace(/\bCLI\b/g, 'DesktopApp');

    // Fix first user action to use GUI verb
    fixed = fixed.replace(
      /Dev->>(\+?)DesktopApp:\s*specforge\s+[^\n]+/,
      `Dev->>$1DesktopApp: Open ${panelName}`
    );

    // Replace "Summary + exit code 0" with desktop-style message
    fixed = fixed.replace(
      /DesktopApp-->>(\-?)Dev:\s*Summary \+ exit code \d+/g,
      `DesktopApp-->>$1Dev: Execution summary with metrics`
    );

    return '```mermaid\n' + fixed + '```';
  });

  // Fix ASCII blocks within the Desktop App section
  const fixedSection2 = fixedSection.replace(/```text\n([\s\S]*?)```/g, (match, asciiContent) => {
    let fixed = asciiContent;

    // Replace CLI box with Desktop App box
    // Handle various box widths for "CLI"
    fixed = fixed
      .replace(/┌─────┐/g, '┌─────────────────┐')
      .replace(/│ CLI │/g, '│   Desktop App   │')
      .replace(/└──┬──┘/g, '└────────┬────────┘');

    // Replace "specforge xxx" user actions with GUI actions
    fixed = fixed.replace(/specforge\s+\S+(?:[ \t]+\S+)*/g, `Open ${panelName}`);

    // Replace "Summary + exit code 0" with desktop-style
    fixed = fixed.replace(/Summary \+\s*\n?\s*exit code \d+/g, 'Summary shown');
    fixed = fixed.replace(/Summary \+ exit code \d+/g, 'Summary shown');

    return '```text\n' + fixed + '```';
  });

  return content.slice(0, desktopStart) + fixedSection2 + content.slice(desktopEnd);
}

// ─── Steps Fix ──────────────────────────────────────────────────────────────

function fixSteps(content, tier, idNum) {
  const reg = PANEL_REGISTRY[idNum];
  if (!reg) return content;

  const panelName = reg.panel;
  const isDualSurface = ['A', 'B', 'C', 'D'].includes(tier);

  // Find the Steps section
  const stepsStart = content.indexOf('\n## Steps');
  if (stepsStart === -1) return content;

  const nextSection = content.indexOf('\n## ', stepsStart + 9);
  const stepsEnd = nextSection === -1 ? content.length : nextSection;
  let stepsSection = content.slice(stepsStart, stepsEnd);

  // Find the first numbered step
  const lines = stepsSection.split('\n');
  let firstStepIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^1\.\s/)) {
      firstStepIdx = i;
      break;
    }
  }

  if (firstStepIdx === -1) return content;

  const firstStep = lines[firstStepIdx];

  // Check if step 1 already mentions desktop app / panel
  if (!firstStep.toLowerCase().includes('desktop app') && !firstStep.includes(panelName)) {
    lines[firstStepIdx] = `1. Open the ${panelName} in the desktop app`;
  }

  // Replace "dashboard" references in other steps (for Tiers E/F)
  for (let i = firstStepIdx + 1; i < lines.length; i++) {
    if (lines[i].match(/^\d+\.\s/)) {
      lines[i] = lines[i]
        .replace(/Open the (web )?dashboard/gi, 'Open the desktop app')
        .replace(/in the (web )?dashboard/gi, 'in the desktop app')
        .replace(/on the (web )?dashboard/gi, 'in the desktop app')
        .replace(/\bThe dashboard\b/g, 'The desktop app')
        .replace(/\bthe dashboard\b/g, 'the desktop app')
        .replace(/\bDashboard /g, 'Desktop app ');
    }
  }

  stepsSection = lines.join('\n');
  return content.slice(0, stepsStart) + stepsSection + content.slice(stepsEnd);
}

// ─── Duplicate Section Cleaner ──────────────────────────────────────────────

function removeDuplicateSections(content) {
  // Check for duplicate ## Steps or ## Traceability sections
  const sections = ['## Steps', '## Traceability', '## State Model', '## Decision Paths'];

  for (const section of sections) {
    const first = content.indexOf(section);
    if (first === -1) continue;

    const second = content.indexOf(section, first + section.length);
    if (second === -1) continue;

    // There are two instances of this section. Keep only the second one
    // (the first one was probably embedded in the mangled use case)
    // Find the end of the first instance (start of next section)
    const nextAfterFirst = content.indexOf('\n## ', first + section.length);
    if (nextAfterFirst === -1 || nextAfterFirst >= second) continue;

    // Remove the first instance (from first to nextAfterFirst)
    content = content.slice(0, first) + content.slice(nextAfterFirst);
  }

  return content;
}

// ─── Main Processing ────────────────────────────────────────────────────────

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  const idMatch = content.match(/id:\s*(UX-SF-(\d+))/);
  if (!idMatch) return;

  const id = idMatch[1];
  const idNum = idMatch[2];
  const tier = getTier(id);

  if (!tier || tier === 'G') return;

  console.log(`  Fixing ${id} (Tier ${tier})`);

  // Step 0: Remove duplicate sections caused by mangled use case
  content = removeDuplicateSections(content);

  // Step 1: Fix Use Case paragraph
  content = fixUseCase(content, tier, idNum);

  // Step 2: Fix Desktop App mermaid diagrams (Tiers A-D only)
  if (['A', 'B', 'C', 'D'].includes(tier)) {
    content = fixDesktopMermaid(content, idNum);
  }

  // Step 3: Fix Steps
  content = fixSteps(content, tier, idNum);

  // Step 4: Clean up any double blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(filePath, content);
  console.log(`  \u2713 Fixed ${id}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('ADR-016 Desktop-First Migration - Fix Script\n');

  const files = fs.readdirSync(CAPS_DIR)
    .filter(f => f.match(/^UX-SF-\d+/))
    .sort();

  console.log(`Found ${files.length} capability files\n`);

  let fixed = 0;
  for (const file of files) {
    const filePath = path.join(CAPS_DIR, file);
    try {
      processFile(filePath);
      fixed++;
    } catch (err) {
      console.error(`  ERROR: ${file}: ${err.message}`);
      console.error(err.stack);
    }
  }

  console.log(`\nFixed: ${fixed} files`);
}

main();
