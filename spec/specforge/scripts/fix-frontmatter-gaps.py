#!/usr/bin/env python3
"""
fix-frontmatter-gaps.py

Fixes field-level gaps left by the automated frontmatter migration:
  1. Roadmap files — add missing `title` derived from H2 heading
  2. Traceability files — add missing `title` derived from H1/H2 heading
  3. Research files — add missing `related_adr: []` for deferred-outcome files
"""

import re
import sys
from pathlib import Path

SPEC_DIR = Path(__file__).resolve().parent.parent

# ── Fix 1: Roadmap titles ────────────────────────────────────────────────

ROADMAP_TITLES = {
    "RM-01-foundation.md": "Phase 1: Foundation",
    "RM-02-multi-agent-orchestration.md": "Phase 2: Multi-Agent Orchestration",
    "RM-03-knowledge-graph-composition.md": "Phase 3: Knowledge Graph & Composition",
    "RM-04-desktop-app.md": "Phase 4: Desktop App (Tauri)",
    "RM-05-web-dashboard-vscode.md": "Phase 5: Web Dashboard + VS Code Extension",
    "RM-06-reverse-engineering-flows.md": "Phase 6: Reverse Engineering & Additional Flows",
    "RM-07-saas-collaboration.md": "Phase 7: SaaS Mode + Collaboration",
    "RM-08-import-export-extensibility.md": "Phase 8: Import/Export + Extensibility Plugins",
    "RM-09-hooks-cost-optimization.md": "Phase 9: Hook Infrastructure + Advanced Cost Optimization",
    "RM-10-memory-agents-mcp.md": "Phase 10: Memory + Advanced Agents + MCP",
    "RM-11-permissions-structured-output.md": "Phase 11: Permission Governance + Structured Output + Stress Testing",
    "RM-12-event-triggered-flows.md": "Phase 12: Event-Triggered Flows & Continuous Verification",
    "RM-13-ecosystem-marketplace.md": "Phase 13: Ecosystem & Agent Marketplace",
    "RM-14-intelligence-layer.md": "Phase 14: Intelligence Layer",
    "RM-15-autonomous-maintenance.md": "Phase 15: Autonomous Specification Maintenance",
    "RM-16-product-track.md": "Product Track",
    "RM-17-dependency-status.md": "External Dependencies",
}


def add_title_after_id(filepath: Path, title: str) -> bool:
    """Insert title: line after the id: line in frontmatter. Returns True if modified."""
    text = filepath.read_text()

    # Skip if title already exists
    if re.search(r"^title:", text, re.MULTILINE):
        return False

    # Insert title after the id: line
    new_text = re.sub(
        r"^(id:\s*.+)$",
        rf'\1\ntitle: "{title}"',
        text,
        count=1,
        flags=re.MULTILINE,
    )
    if new_text == text:
        return False

    filepath.write_text(new_text)
    return True


def fix_roadmap_titles() -> int:
    """Add title to roadmap files. Returns count of modified files."""
    roadmap_dir = SPEC_DIR / "roadmap"
    count = 0
    for filename, title in ROADMAP_TITLES.items():
        filepath = roadmap_dir / filename
        if not filepath.exists():
            print(f"  WARN: {filepath} not found, skipping")
            continue
        if add_title_after_id(filepath, title):
            print(f"  + {filename}: title=\"{title}\"")
            count += 1
        else:
            print(f"  = {filename}: already has title")
    return count


# ── Fix 2: Traceability titles ───────────────────────────────────────────


def extract_heading(text: str) -> str | None:
    """Extract first H1 or H2 heading from the body (after frontmatter)."""
    # Find end of frontmatter
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None
    body = parts[2]
    # Try H1 first, then H2
    match = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
    if not match:
        match = re.search(r"^##\s+(.+)$", body, re.MULTILINE)
    return match.group(1).strip() if match else None


def fix_traceability_titles() -> int:
    """Add title to traceability files. Returns count of modified files."""
    trace_dir = SPEC_DIR / "traceability"
    count = 0
    for filepath in sorted(trace_dir.glob("TRACE-SF-*.md")):
        text = filepath.read_text()
        # Skip TRACE-SF-001 (already has title)
        if re.search(r"^title:", text, re.MULTILINE):
            print(f"  = {filepath.name}: already has title")
            continue

        heading = extract_heading(text)
        if not heading:
            print(f"  WARN: {filepath.name}: no heading found, skipping")
            continue

        if add_title_after_id(filepath, heading):
            print(f"  + {filepath.name}: title=\"{heading}\"")
            count += 1
    return count


# ── Fix 3: Research related_adr ──────────────────────────────────────────

RESEARCH_DEFERRED_MISSING_ADR = [
    "RES-01-agent-teams-orchestration.md",
    "RES-02-hooks-event-architecture.md",
    "RES-04-structured-output-pipeline.md",
    "RES-05-mcp-tool-ecosystem.md",
    "RES-06-permissions-governance.md",
    "RES-08-model-strategy-cost-optimization.md",
    "RES-09-subagent-architecture-patterns.md",
]


def fix_research_related_adr() -> int:
    """Add related_adr: [] to deferred research files. Returns count."""
    research_dir = SPEC_DIR / "research"
    count = 0
    for filename in RESEARCH_DEFERRED_MISSING_ADR:
        filepath = research_dir / filename
        if not filepath.exists():
            print(f"  WARN: {filepath} not found, skipping")
            continue
        text = filepath.read_text()
        if re.search(r"^related_adr:", text, re.MULTILINE):
            print(f"  = {filename}: already has related_adr")
            continue

        # Insert related_adr: [] before the closing ---
        # Find the second --- (end of frontmatter)
        new_text = re.sub(
            r"^(outcome:\s*.+)$\n(---)",
            r"\1\nrelated_adr: []\n\2",
            text,
            count=1,
            flags=re.MULTILINE,
        )
        if new_text == text:
            print(f"  WARN: {filename}: could not insert related_adr")
            continue

        filepath.write_text(new_text)
        print(f"  + {filename}: related_adr: []")
        count += 1
    return count


# ── Main ─────────────────────────────────────────────────────────────────

def main() -> None:
    print("=== Fix 1: Roadmap Titles ===")
    c1 = fix_roadmap_titles()
    print(f"  Modified: {c1} files\n")

    print("=== Fix 2: Traceability Titles ===")
    c2 = fix_traceability_titles()
    print(f"  Modified: {c2} files\n")

    print("=== Fix 3: Research related_adr ===")
    c3 = fix_research_related_adr()
    print(f"  Modified: {c3} files\n")

    total = c1 + c2 + c3
    print(f"=== Total: {total} files modified ===")
    if total == 0:
        print("Nothing to do — all gaps already fixed.")
        sys.exit(0)


if __name__ == "__main__":
    main()
