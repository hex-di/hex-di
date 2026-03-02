import fs from 'fs';
import path from 'path';

const dir = 'spec/specforge/capabilities';

// For each affected file, define the CLI action replacements for user-to-CLI messages
// Format: { [linePrefix]: replacementAction }
// We only replace Dev/Admin/Lead/CO ->> CLI: lines where the action is GUI-style

const CLI_ACTION_MAP = {
  '018': {
    // Approve/reject phase transition
    'Open phase review': 'specforge approve --list',
    'Click "Approve"': 'specforge approve <run-id> --phase 2',
    'Click "Reject", enter feedback': 'specforge reject <run-id> --phase 2 --reason "..."',
  },
  '023': {
    // Approve/reject multi-user
    'Review changes': 'specforge review <run-id>',
    'Click "Approve" (BEH-SF-121)': 'specforge approve <run-id> (BEH-SF-121)',
    'Click "Approve"': 'specforge approve <run-id>',
    'Click "Reject", enter feedback': 'specforge reject <run-id> --reason "..."',
  },
  '027': {
    // Monitor agent backend health
    'Open health panel': 'specforge backends health',
    'HealthStream': 'specforge backends health --watch',
  },
  '060': {
    // Approve elevated permissions
    'Review request details': 'specforge permissions requests --list',
    'Click "Approve"': 'specforge permissions grant <request-id>',
    'Click "Deny", enter reason': 'specforge permissions deny <request-id> --reason "..."',
  },
  '065': {
    // View structured logs
    'Open log viewer': 'specforge logs',
    'LogStream': 'specforge logs --follow',
    'Filter by correlation ID (BEH-SF-057)': 'specforge logs --correlation <id> (BEH-SF-057)',
  },
  '067': {
    // Monitor system health
    'Open system health panel': 'specforge health',
    'HealthStream{components, metrics}': 'specforge health --watch',
  },
  '073': {
    // Manage project lifecycle states
    'Create new project': 'specforge project create',
    'Activate project': 'specforge project activate',
    'Enter maintenance for schema migration': 'specforge project maintenance --reason "schema migration"',
    'Archive completed project': 'specforge project archive',
  },
  '075': {
    // Configure scoped permission boundaries
    'Define scope: compliance/* → read+write': 'specforge permissions scope --path "compliance/*" --access read+write',
    'Define scope: features/* → read-only': 'specforge permissions scope --path "features/*" --access read-only',
    'Enable permission overlay on graph explorer': 'specforge permissions visualize',
    'Click yellow region (features/auth)': 'specforge permissions inspect features/auth',
  },
  '078': {
    // Author custom skills
    'Open new skill form': 'specforge skills create',
    'Fill name, type, content, scope': 'specforge skills create --name "code-review" --type prompt --file ./skill.md',
    'Assign to "spec-author" role': 'specforge skills assign code-review --role spec-author',
    'Add dependency on another skill': 'specforge skills depend code-review --on base-review',
    'Edit skill content': 'specforge skills edit code-review',
  },
  '080': {
    // Define skill workflows
    'Create new workflow': 'specforge workflows create',
    'Select "security-review" template': 'specforge workflows create --template security-review',
    'Modify steps and parameters': 'specforge workflows edit <workflow-id>',
    'Validate workflow': 'specforge workflows validate <workflow-id>',
  },
  '082': {
    // Run/monitor skill workflows
    'Execute workflow': 'specforge workflows run <workflow-id>',
  },
  '084': {
    // Configure agent output schemas
    'Open output schema config': 'specforge schemas list',
    'Edit reviewer schema': 'specforge schemas set reviewer --file ./schema.json',
    'Set fallback to text mode': 'specforge schemas set reviewer --fallback text',
  },
  '086': {
    // Connect third-party integration
    'Open integrations panel': 'specforge integrations list',
    'Configure Jira adapter': 'specforge integrations connect jira --url <url> --token <token>',
    'Map entity types': 'specforge integrations map jira --config ./mappings.yaml',
    'Start initial sync': 'specforge integrations sync jira',
  },
  '090': {
    // Configure autonomous maintenance
    'Open autonomous maintenance config': 'specforge maintenance config',
    'Set drift threshold to 0.3': 'specforge maintenance config --threshold 0.3',
    'Configure approval gate': 'specforge maintenance config --approval required',
    'Schedule weekly audit trigger': 'specforge maintenance schedule "0 2 * * 1"',
    'Enable proactive mode': 'specforge maintenance config --proactive --velocity 0.7',
  },
};

let fixedCount = 0;

for (const [num, actionMap] of Object.entries(CLI_ACTION_MAP)) {
  const pattern = new RegExp(`UX-SF-${num}-`);
  const file = fs.readdirSync(dir).find(f => f.match(pattern));
  if (!file) {
    console.log(`WARNING: No file found for UX-SF-${num}`);
    continue;
  }

  const filepath = path.join(dir, file);
  let content = fs.readFileSync(filepath, 'utf-8');

  // Find CLI section
  const cliStart = content.indexOf('### CLI');
  if (cliStart === -1) { console.log(`No CLI section in ${file}`); continue; }

  // Find the end of CLI section (next ## section)
  const afterCli = content.substring(cliStart);
  const nextSectionMatch = afterCli.match(/\n## /);
  const cliEnd = nextSectionMatch ? cliStart + nextSectionMatch.index : content.length;

  let cliSection = content.substring(cliStart, cliEnd);
  let changed = false;

  // Replace each GUI action with CLI command in mermaid blocks
  for (const [guiAction, cliCommand] of Object.entries(actionMap)) {
    const escaped = guiAction.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match "Actor->>+CLI: <guiAction>" or "Actor->>CLI: <guiAction>"
    const regex = new RegExp(`((?:Dev|Admin|Lead|CO)->>\\+?CLI:\\s*)${escaped}`, 'g');
    const newSection = cliSection.replace(regex, `$1${cliCommand}`);
    if (newSection !== cliSection) {
      cliSection = newSection;
      changed = true;
    }
  }

  if (changed) {
    content = content.substring(0, cliStart) + cliSection + content.substring(cliEnd);
    fs.writeFileSync(filepath, content);
    fixedCount++;
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`No changes: ${file}`);
  }
}

console.log(`\nTotal fixed: ${fixedCount}`);
