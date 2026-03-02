import fs from 'fs';

const dir = 'spec/specforge/capabilities';
const files = [
  'UX-SF-001-run-predefined-flow.md',
  'UX-SF-002-run-flow-with-preset.md',
  'UX-SF-005-pause-resume-cancel-flow.md',
  'UX-SF-008-register-custom-flow.md',
  'UX-SF-026-register-configure-agent-backends.md',
  'UX-SF-029-create-dynamic-agent-roles.md',
  'UX-SF-038-set-token-budgets.md',
  'UX-SF-040-configure-notification-preferences.md',
  'UX-SF-042-configure-model-routing.md',
  'UX-SF-045-enable-disable-manage-plugins.md',
  'UX-SF-047-browse-search-marketplace.md',
  'UX-SF-090-configure-autonomous-maintenance.md',
];

for (const f of files) {
  const content = fs.readFileSync(`${dir}/${f}`, 'utf-8');
  const desktopMatch = content.match(/### Desktop App\n[\s\S]*?```text\n([\s\S]*?)```/);
  if (!desktopMatch) { console.log(`${f}: NO ASCII`); continue; }
  const lines = desktopMatch[1].split('\n');
  // Box header = line 0 (┌), line 1 (│ name │), line 2 (└)
  const headerLine = lines[1] || '';
  const keywords = ['Open ', 'Set ', 'Click', 'Toggle', 'Configure'];
  const hasBrokenKeyword = keywords.some(k => headerLine.includes(k));
  if (hasBrokenKeyword) {
    console.log(`BROKEN: ${f}`);
    console.log(`  Header: ${headerLine}`);
  } else {
    console.log(`OK: ${f}`);
  }
}
