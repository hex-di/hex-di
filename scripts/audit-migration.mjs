import fs from 'fs';
import path from 'path';

const dir = 'spec/specforge/capabilities';
const files = fs.readdirSync(dir).filter(f => f.match(/^UX-SF-\d+/)).sort();

const TIER_G = ['007','039','049','050','051','052'];

let cliMermaidDesktopApp = [];
let desktopAsciiCliStyle = [];
let desktopMermaidOffByOne = [];

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf-8');
  const idMatch = content.match(/id: UX-SF-(\d+)/);
  if (!idMatch) continue;
  const num = idMatch[1];
  if (TIER_G.includes(num)) continue;

  // 1. Check if CLI mermaid section has DesktopApp references
  const cliSectionMatch = content.match(/### CLI\n([\s\S]*?)(?=\n## |$)/);
  if (cliSectionMatch) {
    const cliSection = cliSectionMatch[1];
    const mermaidBlocks = cliSection.match(/```mermaid\n([\s\S]*?)```/g);
    if (mermaidBlocks) {
      for (const block of mermaidBlocks) {
        if (block.includes('DesktopApp')) {
          cliMermaidDesktopApp.push('UX-SF-' + num);
        }
      }
    }
  }

  // 2. Check if Desktop App ASCII has CLI-style user action labels
  const desktopSectionMatch = content.match(/### Desktop App\n([\s\S]*?)(?=\n### CLI|\n## )/);
  if (desktopSectionMatch) {
    const desktopSection = desktopSectionMatch[1];
    const asciiBlocks = desktopSection.match(/```text\n([\s\S]*?)```/g);
    if (asciiBlocks) {
      for (const block of asciiBlocks) {
        const lines = block.split('\n');
        for (const line of lines) {
          // CLI-style actions going from user to Desktop App
          if (line.match(/│\s+(specforge|run |pause |resume |cancel |config |--\w)/)) {
            desktopAsciiCliStyle.push('UX-SF-' + num);
            break;
          }
        }
      }
    }
  }

  // 3. Check Desktop App mermaid for duplicate or mismatched GUI actions
  if (desktopSectionMatch) {
    const desktopSection = desktopSectionMatch[1];
    const mermaidBlocks = desktopSection.match(/```mermaid\n([\s\S]*?)```/g);
    if (mermaidBlocks) {
      for (const block of mermaidBlocks) {
        const devActions = [];
        const blockLines = block.split('\n');
        for (const line of blockLines) {
          const m = line.match(/Dev->>.*?DesktopApp:\s*(.+)/);
          if (m) devActions.push(m[1].trim());
          const m2 = line.match(/Admin->>.*?DesktopApp:\s*(.+)/);
          if (m2) devActions.push(m2[1].trim());
        }
        // Check for duplicate consecutive actions
        for (let i = 1; i < devActions.length; i++) {
          if (devActions[i] === devActions[i-1]) {
            desktopMermaidOffByOne.push({ id: 'UX-SF-' + num, actions: devActions });
            break;
          }
        }
      }
    }
  }
}

console.log('=== CLI mermaid sections with DesktopApp refs (' + cliMermaidDesktopApp.length + ') ===');
cliMermaidDesktopApp.forEach(x => console.log('  ' + x));

console.log('\n=== Desktop App ASCII with CLI-style labels (' + desktopAsciiCliStyle.length + ') ===');
desktopAsciiCliStyle.forEach(x => console.log('  ' + x));

console.log('\n=== Desktop App mermaid with duplicate actions (' + desktopMermaidOffByOne.length + ') ===');
desktopMermaidOffByOne.forEach(x => console.log('  ' + x.id + ': ' + JSON.stringify(x.actions)));
