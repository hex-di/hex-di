import fs from 'fs';
import path from 'path';

const dir = 'spec/specforge/capabilities';
const files = fs.readdirSync(dir).filter(f => f.match(/^UX-SF-\d+/)).sort();

const TIER_G = ['007','039','049','050','051','052'];
let fixedCount = 0;

for (const f of files) {
  const filepath = path.join(dir, f);
  let content = fs.readFileSync(filepath, 'utf-8');
  const idMatch = content.match(/id: UX-SF-(\d+)/);
  if (!idMatch) continue;
  const num = idMatch[1];
  if (TIER_G.includes(num)) continue;

  // Check if file has Dash references in mermaid
  if (!content.includes('Dash')) continue;

  // Split content into Desktop App and CLI sections
  const desktopStart = content.indexOf('### Desktop App');
  const cliStart = content.indexOf('### CLI');
  const stepsStart = content.indexOf('## Steps');

  if (desktopStart === -1) continue;

  let changed = false;

  // Fix Desktop App mermaid sections: Dash → DesktopApp
  if (cliStart > desktopStart) {
    // Has both sections
    let desktopSection = content.substring(desktopStart, cliStart);
    let cliSection = content.substring(cliStart, stepsStart > cliStart ? stepsStart : content.length);

    // In Desktop App section: replace Dash with DesktopApp in mermaid blocks
    const origDesktop = desktopSection;
    desktopSection = desktopSection.replace(/```mermaid\n([\s\S]*?)```/g, (match, mermaidContent) => {
      let fixed = mermaidContent;
      // Replace participant declaration
      fixed = fixed.replace(/participant Dash as .+/g, (line) => {
        // Extract the panel name from the alias
        const aliasMatch = line.match(/participant Dash as (.+)/);
        if (aliasMatch) {
          return `participant DesktopApp as Desktop App (${aliasMatch[1].replace('Dashboard ', '').replace('Dashboard', '')})`.replace(/\(\s*\)/, '').replace(/Desktop App \(Desktop App\)/, 'Desktop App').trim();
        }
        return line;
      });
      // Replace Dash participant references in messages
      fixed = fixed.replace(/\bDash\b/g, 'DesktopApp');
      return '```mermaid\n' + fixed + '```';
    });

    // In CLI section: replace Dash with CLI in mermaid blocks
    const origCli = cliSection;
    cliSection = cliSection.replace(/```mermaid\n([\s\S]*?)```/g, (match, mermaidContent) => {
      let fixed = mermaidContent;
      // Replace participant declaration: keep it simple as CLI
      fixed = fixed.replace(/participant Dash as .+/g, 'participant CLI');
      fixed = fixed.replace(/participant DesktopApp as .+/g, 'participant CLI');
      // Replace Dash/DesktopApp participant references in messages
      fixed = fixed.replace(/\bDash\b/g, 'CLI');
      fixed = fixed.replace(/\bDesktopApp\b/g, 'CLI');
      return '```mermaid\n' + fixed + '```';
    });

    if (desktopSection !== origDesktop || cliSection !== origCli) {
      content = content.substring(0, desktopStart) + desktopSection + cliSection +
                (stepsStart > cliStart ? content.substring(stepsStart) : '');
      changed = true;
    }
  } else if (stepsStart > desktopStart) {
    // Desktop App only (no CLI section) — Tiers E/F
    let desktopSection = content.substring(desktopStart, stepsStart);
    const origDesktop = desktopSection;
    desktopSection = desktopSection.replace(/```mermaid\n([\s\S]*?)```/g, (match, mermaidContent) => {
      let fixed = mermaidContent;
      fixed = fixed.replace(/participant Dash as .+/g, (line) => {
        const aliasMatch = line.match(/participant Dash as (.+)/);
        if (aliasMatch) {
          const name = aliasMatch[1].replace('Dashboard ', '').replace('Dashboard', '').trim();
          return name ? `participant DesktopApp as Desktop App (${name})` : 'participant DesktopApp as Desktop App';
        }
        return line;
      });
      fixed = fixed.replace(/\bDash\b/g, 'DesktopApp');
      return '```mermaid\n' + fixed + '```';
    });

    if (desktopSection !== origDesktop) {
      content = content.substring(0, desktopStart) + desktopSection + content.substring(stepsStart);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filepath, content);
    fixedCount++;
    console.log(`Fixed: ${f}`);
  }
}

console.log(`\nTotal fixed: ${fixedCount}`);

// Verify no Dash remains in mermaid
console.log('\n--- Remaining Dash in mermaid ---');
for (const f of files) {
  const filepath = path.join(dir, f);
  const content = fs.readFileSync(filepath, 'utf-8');
  const mermaidBlocks = content.match(/```mermaid\n([\s\S]*?)```/g) || [];
  for (const block of mermaidBlocks) {
    if (block.match(/->>.*Dash:|Dash-->|participant Dash/)) {
      console.log(`  STILL HAS Dash: ${f}`);
      break;
    }
  }
}
