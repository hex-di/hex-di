import fs from 'fs';
import path from 'path';

const dir = 'spec/specforge/capabilities';

// Map of capability number -> array of GUI-style user action labels for Desktop App ASCII
// These replace CLI-style labels like "run spec-verify", "--events flow.complete", etc.
const ASCII_GUI_ACTIONS = {
  '001': [
    ['run spec-verify', 'Open Flow\n      │ Launcher'],
  ],
  '002': [
    ['run spec-verify', 'Open Flow\n      │ Launcher'],
    ['--preset nightly', 'Select preset\n      │ "nightly"'],
  ],
  '005': [
    ['run spec-verify', 'Open Flow\n      │ Control'],
    ['pause <run-id>', 'Click\n      │ "Pause"'],
    ['resume <run-id>', 'Click\n      │ "Resume"'],
  ],
  '008': [
    ['register', 'Open Flow\n      │ Registry'],
  ],
  '025': [
    ['hand-off', 'Click\n      │ "Transfer"'],
  ],
  '026': [
    ['register', 'Open Agent\n      │ Backends'],
    ['configure', 'Click\n      │ "Configure"'],
  ],
  '028': [
    ['configure', 'Open MCP\n      │ Config'],
  ],
  '029': [
    ['roles create', 'Open Agent\n      │ Roles'],
  ],
  '037': [
    ['config deploy', 'Open Deploy\n      │ Settings'],
  ],
  '038': [
    ['config budgets', 'Open Budget\n      │ Settings'],
    ['--daily', 'Set daily\n      │ limit'],
    ['--flow', 'Set flow\n      │  budget'],
    ['--overflow', 'Set overflow\n      │  -policy'],
  ],
  '040': [
    ['config', 'Open Notif\n      │ Settings'],
    ['--events', 'Configure\n      │ event'],
    ['--channels', 'Set\n      │ channels'],
    ['--test', 'Click\n      │ "Test"'],
  ],
  '042': [
    ['config model', 'Open Model\n      │ Routing'],
  ],
  '045': [
    ['plugins disable', 'Toggle\n      │ disable'],
    ['plugins enable', 'Toggle\n      │ enable'],
  ],
  '047': [
    ['marketplace', 'Open Agent\n      │ Marketplace'],
    ['--install', 'Click\n      │ "Install"'],
  ],
  '058': [
    ['access-matrix', 'Open Access\n      │ Matrix'],
  ],
  '059': [
    ['permissions', 'Open Perm\n      │ Preview'],
    ['--preview', 'Click\n      │ "Preview"'],
  ],
  '061': [
    ['tool-isolation', 'Open Tool\n      │ Isolation'],
  ],
  '066': [
    ['traces export', 'Open Trace\n      │ Export'],
  ],
  '071': [
    ['graph pipeline', 'Open Graph\n      │ Pipeline'],
  ],
  '090': [
    ['maintenance', 'Open Maint.\n      │ Settings'],
    ['--schedule', 'Set\n      │ schedule'],
  ],
};

let fixedCount = 0;

for (const [num, replacements] of Object.entries(ASCII_GUI_ACTIONS)) {
  const pattern = new RegExp(`UX-SF-${num}-`);
  const file = fs.readdirSync(dir).find(f => f.match(pattern));
  if (!file) {
    console.log(`WARNING: No file found for UX-SF-${num}`);
    continue;
  }

  let content = fs.readFileSync(path.join(dir, file), 'utf-8');

  // Find the Desktop App section
  const desktopMatch = content.match(/(### Desktop App\n[\s\S]*?```text\n)([\s\S]*?)(```)/);
  if (!desktopMatch) {
    console.log(`WARNING: No Desktop App ASCII found in ${file}`);
    continue;
  }

  let asciiContent = desktopMatch[2];
  let changed = false;

  for (const [cliLabel, guiLabel] of replacements) {
    // Match the CLI-style label in the ASCII art (multi-line user action)
    // These appear as text between │ markers going from the user to Desktop App
    // We need to match the specific CLI text and replace with GUI text

    // Simple approach: find the CLI text patterns in the ASCII block
    // CLI labels like "run spec-verify" appear on lines like "      │ run spec-verify       │"

    // For single-word patterns, match the line
    const escapedLabel = cliLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match lines containing the CLI label (between │ markers)
    const lineRegex = new RegExp(`(│\\s+)${escapedLabel}`, 'i');
    if (asciiContent.match(lineRegex)) {
      // Replace just the first line of the multi-line label if guiLabel has \n
      const guiLines = guiLabel.split('\n');
      asciiContent = asciiContent.replace(lineRegex, `$1${guiLines[0]}`);
      changed = true;
    }
  }

  if (changed) {
    content = content.replace(desktopMatch[2], asciiContent);
    fs.writeFileSync(path.join(dir, file), content);
    fixedCount++;
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`No changes needed: ${file}`);
  }
}

console.log(`\nTotal fixed: ${fixedCount}`);
