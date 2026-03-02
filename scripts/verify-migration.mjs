import fs from 'fs';
import path from 'path';

const dir = 'spec/specforge/capabilities';
const files = fs.readdirSync(dir).filter(f => f.match(/^UX-SF-\d+/)).sort();
const TIER_G = ['007','039','049','050','051','052'];
const DUAL = ['001','002','003','005','008','009','010','012','013','014','015','016','017','018','019','020','023','025','026','027','028','029','036','037','038','040','042','044','045','046','047','048','053','054','056','057','058','059','060','061','062','063','064','065','066','067','068','071','073','074','075','076','078','080','082','084','086','090'];

let stats = { total: 0, ok: 0 };
let issues = [];

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf-8');
  const idMatch = content.match(/id: UX-SF-(\d+)/);
  if (!idMatch) continue;
  const num = idMatch[1];
  if (TIER_G.includes(num)) continue;
  stats.total++;

  const fileIssues = [];

  // 1. Check surface has desktop first
  const surfaceMatch = content.match(/surface: \[(.*?)\]/);
  if (surfaceMatch && !surfaceMatch[1].startsWith('desktop')) {
    fileIssues.push('surface not desktop-first');
  }

  // 2. Check for DesktopApp in mermaid
  if (!content.includes('DesktopApp') && !content.includes('Desktop App')) {
    fileIssues.push('no Desktop App reference');
  }

  // 3. For dual-surface, check for ### CLI section and ### Desktop App
  if (DUAL.includes(num)) {
    if (!content.includes('### CLI')) fileIssues.push('missing ### CLI');
    if (!content.includes('### Desktop App')) fileIssues.push('missing ### Desktop App');
  }

  // 4. Check duplicate CLI notes
  const cliNotes = (content.match(/The same operation is accessible via CLI/g) || []).length;
  if (cliNotes > 1) fileIssues.push(`duplicate CLI note (${cliNotes}x)`);

  // 5. Check BEH references preserved
  const behRefs = content.match(/BEH-SF-\d+/g) || [];
  if (behRefs.length === 0) fileIssues.push('no BEH refs found');

  // 6. Check Traceability section exists
  if (!content.includes('## Traceability')) fileIssues.push('missing Traceability');

  if (fileIssues.length === 0) {
    stats.ok++;
  } else {
    issues.push({ num, file: f, issues: fileIssues });
  }
}

console.log(`\nVerification Results: ${stats.ok}/${stats.total} files OK\n`);

if (issues.length > 0) {
  console.log('Files with issues:');
  for (const i of issues) {
    console.log(`  UX-SF-${i.num}: ${i.issues.join(', ')}`);
  }
}

// Count structural elements
let desktopAppDiagrams = 0;
let cliDiagrams = 0;
for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf-8');
  const desktopMermaid = (content.match(/```mermaid[\s\S]*?DesktopApp[\s\S]*?```/g) || []).length;
  const cliMermaid = (content.match(/```mermaid[\s\S]*?participant CLI[\s\S]*?```/g) || []).length;
  desktopAppDiagrams += desktopMermaid;
  cliDiagrams += cliMermaid;
}
console.log(`\nDiagram counts: ${desktopAppDiagrams} Desktop App mermaid, ${cliDiagrams} CLI mermaid`);
