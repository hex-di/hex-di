import fs from 'fs';

const dir = 'spec/specforge/capabilities';
const files = fs.readdirSync(dir).filter(f => f.match(/^UX-SF-\d+/)).sort();
const TIER_G = ['007','039','049','050','051','052'];

const issues = [];

for (const f of files) {
  const content = fs.readFileSync(`${dir}/${f}`, 'utf-8');
  const idMatch = content.match(/id: UX-SF-(\d+)/);
  if (!idMatch) continue;
  if (TIER_G.includes(idMatch[1])) continue;

  const cliMatch = content.match(/### CLI\n([\s\S]*?)(?=\n## |$)/);
  if (!cliMatch) continue;

  const cliSection = cliMatch[1];
  const blocks = cliSection.match(/```mermaid\n([\s\S]*?)```/g);
  if (!blocks) continue;

  for (const block of blocks) {
    const lines = block.split('\n');
    for (const line of lines) {
      const m = line.match(/->>.*?CLI:\s*(.+)/);
      if (m && !m[1].startsWith('specforge')) {
        issues.push({ file: f, line: line.trim(), action: m[1] });
      }
    }
  }
}

console.log(`Found ${issues.length} CLI mermaid lines with GUI-style actions:\n`);
// Group by file
const byFile = {};
for (const i of issues) {
  byFile[i.file] = byFile[i.file] || [];
  byFile[i.file].push(i.action);
}
for (const [file, actions] of Object.entries(byFile)) {
  console.log(`${file}:`);
  actions.forEach(a => console.log(`  - ${a}`));
}
