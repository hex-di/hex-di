#!/usr/bin/env python3
"""Add YAML frontmatter to all spec/specforge markdown files.

stdlib only — no pyyaml needed. Processes each directory type with a
dedicated handler that extracts metadata via regex, builds the frontmatter
string, injects it at the top, and removes redundant prose lines.

Usage: python3 spec/specforge/scripts/add-frontmatter.py [--dry-run]
"""
import os
import re
import sys
from pathlib import Path

SPEC_DIR = Path(__file__).resolve().parent.parent
DRY_RUN = "--dry-run" in sys.argv

# --- Helpers ----------------------------------------------------------------

def read_file(path: Path) -> str:
    return path.read_text(encoding="utf-8")

def write_file(path: Path, content: str) -> None:
    if DRY_RUN:
        print(f"  [DRY-RUN] would write {path}")
    else:
        path.write_text(content, encoding="utf-8")

def has_frontmatter(content: str) -> bool:
    return content.startswith("---\n")

def yaml_list(items: list) -> str:
    if not items:
        return "[]"
    escaped = []
    for item in items:
        s = str(item).strip()
        if "," in s or ":" in s or s.startswith("{") or s.startswith("["):
            escaped.append(f'"{s}"')
        else:
            escaped.append(s)
    return "[" + ", ".join(escaped) + "]"

def yaml_str(s: str) -> str:
    s = s.strip()
    if any(c in s for c in ":#{}[]&*?|>!%@`'\""):
        return f'"{s}"'
    return s

def extract_bold(content: str, key: str) -> str:
    """Extract value from **Key:** value line."""
    m = re.search(rf"\*\*{re.escape(key)}:\*\*\s*(.+)", content)
    return m.group(1).strip() if m else ""

def extract_link_ids(text: str) -> list:
    """Extract bare IDs from markdown links like [INV-SF-7](...)."""
    return re.findall(r"\[([A-Z][\w-]+)\]", text)

def remove_line(content: str, pattern: str) -> str:
    """Remove lines matching pattern."""
    return re.sub(rf"^{pattern}.*\n?", "", content, flags=re.MULTILINE)

def remove_bold_line(content: str, key: str) -> str:
    """Remove a **Key:** ... line."""
    return re.sub(rf"^\*\*{re.escape(key)}:\*\*.*\n?", "", content, flags=re.MULTILINE)

def title_from_h1(content: str) -> str:
    m = re.search(r"^#\s+(.+)", content, re.MULTILINE)
    return m.group(1).strip() if m else ""

def title_from_h2(content: str) -> str:
    m = re.search(r"^##\s+(.+)", content, re.MULTILINE)
    return m.group(1).strip() if m else ""

def id_from_filename(path: Path) -> str:
    """Extract ID from filename like ADR-005-graph-first.md -> ADR-005."""
    stem = path.stem
    # Match patterns like ADR-005, BEH-SF-001, INV-SF-7, FM-SF-001, TRACE-SF-001, etc.
    m = re.match(r"((?:ADR|BEH|INV|FM|TRACE|FEAT|RES|RM|PLG|COMP|PROC|TYPE|TS)[\w-]*?\d+)", stem)
    if m:
        return m.group(1)
    # Try more specific: anything before the first alphabetic-kebab segment
    m = re.match(r"([A-Z]+-[A-Z]*-?\d+)", stem)
    if m:
        return m.group(1)
    return stem

def build_frontmatter(fields: dict) -> str:
    lines = ["---"]
    for k, v in fields.items():
        if v is None or v == "":
            continue
        if isinstance(v, list):
            lines.append(f"{k}: {yaml_list(v)}")
        else:
            lines.append(f"{k}: {yaml_str(str(v))}")
    lines.append("---")
    return "\n".join(lines) + "\n"

def inject_frontmatter(content: str, fm: str) -> str:
    return fm + "\n" + content

def remove_section(content: str, heading: str) -> str:
    """Remove an entire ## section (heading + all content until next ##)."""
    pattern = rf"^## {re.escape(heading)}.*?(?=^## |\Z)"
    return re.sub(pattern, "", content, flags=re.MULTILINE | re.DOTALL)

def clean_leading_rules(content: str) -> str:
    """Remove leading --- horizontal rules after frontmatter injection."""
    # Remove standalone --- lines that are just horizontal rules (not frontmatter)
    content = re.sub(r"^\n*---\s*\n", "\n", content, count=1)
    return content

# --- Directory Handlers -----------------------------------------------------

def process_decisions(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "decisions"
    for f in sorted(d.glob("ADR-*.md")):
        content = read_file(f)
        if has_frontmatter(content):
            continue
        fid = id_from_filename(f)
        title = title_from_h1(content).replace(f"{fid}: ", "").replace(f"{fid} — ", "")
        status = extract_bold(content, "Status") or "Accepted"
        date_str = extract_bold(content, "Date") or ""
        # Extract just the date part: "2025-03-01 (revised 2026-02-27)" -> "2025-03-01"
        date_clean = re.sub(r"\s*\(.*\)", "", date_str).strip()
        supersedes_raw = extract_bold(content, "Supersedes")
        supersedes = []
        if supersedes_raw:
            supersedes = re.findall(r"ADR-\d+", supersedes_raw)
        # Extract invariant references from the body
        inv_refs = list(set(re.findall(r"INV-SF-\d+", content)))
        inv_refs.sort()

        fm = build_frontmatter({
            "id": fid,
            "kind": "decision",
            "title": title,
            "status": status,
            "date": date_clean,
            "supersedes": supersedes,
            "invariants": inv_refs,
        })
        # Remove prose metadata lines
        content = remove_bold_line(content, "Status")
        content = remove_bold_line(content, "Date")
        content = remove_bold_line(content, "Supersedes")
        # Remove ## Status section if it exists as a section
        content = re.sub(r"^## Status\s*\n\s*\n\s*(Accepted|Superseded|Deprecated).*\n", "", content, flags=re.MULTILINE)
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_invariants(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "invariants"
    for f in sorted(d.glob("INV-*.md")):
        content = read_file(f)
        if has_frontmatter(content):
            continue
        fid = id_from_filename(f)
        title = (title_from_h1(content) or title_from_h2(content))
        title = re.sub(r"^INV-SF-\d+:\s*", "", title)

        enforced_raw = extract_bold(content, "Enforced by")
        enforced_by = []
        if enforced_raw:
            # Split on commas, clean backticks
            enforced_by = [s.strip().strip("`") for s in enforced_raw.split(",")]

        behaviors_raw = extract_bold(content, "Referenced from")
        behaviors = []
        if behaviors_raw:
            behaviors = re.findall(r"BEH-SF-\d+", behaviors_raw)
            behaviors = list(set(behaviors))
            behaviors.sort()

        risk_raw = extract_bold(content, "Risk")
        risk = ""
        if risk_raw:
            risk_ids = re.findall(r"FM-SF-\d+", risk_raw)
            risk = risk_ids[0] if risk_ids else ""

        fm = build_frontmatter({
            "id": fid,
            "kind": "invariant",
            "title": title,
            "status": "active",
            "enforced_by": enforced_by,
            "behaviors": behaviors,
            "risk": risk,
        })
        content = remove_bold_line(content, "Enforced by")
        content = remove_bold_line(content, "Referenced from")
        content = remove_bold_line(content, "Risk")
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_research(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "research"
    for f in sorted(d.glob("RES-*.md")):
        content = read_file(f)
        if has_frontmatter(content):
            continue
        fid = id_from_filename(f)
        title = title_from_h1(content)
        title = re.sub(r"^Research:\s*", "", title)
        date_str = extract_bold(content, "Date") or ""
        status = extract_bold(content, "Status") or "active"
        scope = extract_bold(content, "Scope") or ""
        # Try to extract outcome from index.yaml later; for now, infer from content
        related_adr = re.findall(r"ADR-\d+", content)
        related_adr = list(set(related_adr))
        related_adr.sort()

        fm = build_frontmatter({
            "id": fid,
            "kind": "research",
            "title": title,
            "status": status,
            "date": date_str,
            "outcome": "adr" if related_adr else "deferred",
            "related_adr": related_adr[0] if related_adr else "",
        })
        content = remove_bold_line(content, "Date")
        content = remove_bold_line(content, "Status")
        content = remove_bold_line(content, "Scope")
        content = remove_bold_line(content, "Sources")
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_behaviors(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "behaviors"
    for f in sorted(d.glob("BEH-*.md")):
        content = read_file(f)
        if has_frontmatter(content):
            continue
        fid = id_from_filename(f)
        title = title_from_h1(content)
        # Clean title: remove "01 — " prefix pattern
        title = re.sub(r"^\d+\s*[—–-]\s*", "", title)

        # Extract header metadata
        invariants_raw = extract_bold(content, "Invariants")
        invariants = extract_link_ids(invariants_raw) if invariants_raw else []
        # Also find invariants in body blockquotes
        body_invs = re.findall(r"INV-SF-\d+", content)
        invariants = list(set(invariants + body_invs))
        invariants.sort()

        adrs_raw = extract_bold(content, "ADRs")
        adrs = extract_link_ids(adrs_raw) if adrs_raw else []
        if not adrs:
            adrs = list(set(re.findall(r"ADR-\d+", content)))
            adrs.sort()

        types_raw = extract_bold(content, "Types")
        types = []
        if types_raw:
            types = re.findall(r"types/([\w-]+)\.md", types_raw)

        # Extract source chapters (will be removed)
        # Extract id_range from BEH IDs in file
        all_beh_ids = re.findall(r"BEH-SF-(\d+)", content)
        id_range = ""
        if all_beh_ids:
            nums = sorted(set(int(x) for x in all_beh_ids))
            id_range = f"{nums[0]:03d}--{nums[-1]:03d}"

        # Extract ports from ## Ports Used section
        ports = []
        ports_section = re.search(r"## Ports Used\s*\n(.*?)(?=\n## |\Z)", content, re.DOTALL)
        if ports_section:
            ports = re.findall(r"\*\*(\w+Port)\*\*", ports_section.group(1))

        fm = build_frontmatter({
            "id": fid,
            "kind": "behavior",
            "title": title,
            "status": "active",
            "id_range": id_range,
            "invariants": invariants,
            "adrs": adrs,
            "types": types,
            "ports": ports,
        })

        # Remove header metadata lines
        content = remove_bold_line(content, "Source chapters")
        content = remove_bold_line(content, "Invariants")
        content = remove_bold_line(content, "ADRs")
        content = remove_bold_line(content, "Types")

        # Remove the --- horizontal rule after the removed header lines
        # (the one that separates header from first BEH section)
        content = re.sub(r"^\s*---\s*\n(?=\s*\n*## BEH-)", "\n", content, count=1, flags=re.MULTILINE)

        # Remove footer sections
        content = remove_section(content, "Ports Used")
        content = remove_section(content, "Referenced Invariants")
        content = remove_section(content, "Referenced ADRs")

        # Clean trailing whitespace
        content = content.rstrip() + "\n"
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_types(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "types"
    for f in sorted(d.glob("*.md")):
        if f.name == "index.md":
            continue
        content = read_file(f)
        if has_frontmatter(content):
            continue
        title = title_from_h1(content)
        domain = f.stem

        behaviors_raw = extract_bold(content, "Source behaviors")
        behaviors = []
        if behaviors_raw:
            behaviors = extract_link_ids(behaviors_raw)
        source_chapters = extract_bold(content, "Source chapters")

        # Extract ADRs referenced
        adrs = list(set(re.findall(r"ADR-\d+", content)))
        adrs.sort()

        fm = build_frontmatter({
            "kind": "types",
            "title": title,
            "status": "active",
            "domain": domain,
            "behaviors": behaviors,
            "adrs": adrs,
        })
        content = remove_bold_line(content, "Source behaviors")
        content = remove_bold_line(content, "Source chapters")
        # Remove Cross-references block if it's just links
        content = re.sub(r"^\*\*Cross-references:\*\*.*\n?", "", content, flags=re.MULTILINE)
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_architecture(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "architecture"
    for f in sorted(d.glob("*.md")):
        if f.name in ("index.md",):
            continue
        content = read_file(f)
        if has_frontmatter(content):
            continue
        title = title_from_h1(content)
        fname = f.stem

        # Determine c4_level from filename
        c4_level = "mapping"
        if fname.startswith("c1-"):
            c4_level = "L1"
        elif fname.startswith("c2-"):
            c4_level = "L2"
        elif fname.startswith("c3-"):
            c4_level = "L3"
        elif fname.startswith("dynamic-"):
            c4_level = "dynamic"
        elif fname.startswith("deployment-"):
            c4_level = "deployment"

        fm = build_frontmatter({
            "kind": "architecture",
            "title": title,
            "status": "active",
            "c4_level": c4_level,
        })
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_traceability(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "traceability"
    for f in sorted(d.glob("TRACE-*.md")):
        content = read_file(f)
        if has_frontmatter(content):
            continue
        fid = id_from_filename(f)
        title = title_from_h1(content)
        title = re.sub(r"^TRACE-SF-\d+:\s*", "", title)

        # Try to determine scope from content
        scope = "capability"
        lower = content.lower()
        if "invariant" in f.stem.lower() or "invariant traceability" in lower:
            scope = "invariant"
        elif "adr" in f.stem.lower() or "decision" in lower:
            scope = "adr"
        elif "test" in f.stem.lower():
            scope = "test"
        elif "dod" in f.stem.lower() or "definition" in lower:
            scope = "dod"

        fm = build_frontmatter({
            "id": fid,
            "kind": "traceability",
            "title": title,
            "status": "active",
            "scope": scope,
        })

        # Remove metadata table from TRACE-SF-001 if present
        content = re.sub(r"^\| Field \| Value \|.*?(?=\n[^|]|\n\n|\Z)", "", content, flags=re.MULTILINE | re.DOTALL)

        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_risk_assessment(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "risk-assessment"
    for f in sorted(d.glob("FM-*.md")):
        content = read_file(f)
        if has_frontmatter(content):
            continue
        fid = id_from_filename(f)
        title = title_from_h1(content)
        title = re.sub(r"^FM-SF-\d+:\s*", "", title)

        # Extract invariants
        inv_raw = extract_bold(content, "Invariant")
        invariants = []
        if inv_raw:
            invariants = re.findall(r"INV-SF-\d+", inv_raw)
        if not invariants:
            invariants = list(set(re.findall(r"INV-SF-\d+", content)))
        invariants.sort()

        # Extract FM ID range
        all_fm_ids = re.findall(r"FM-SF-(\d+)", content)
        fm_range = ""
        if all_fm_ids:
            nums = sorted(set(int(x) for x in all_fm_ids))
            fm_range = f"{nums[0]:03d}--{nums[-1]:03d}"

        fm = build_frontmatter({
            "id": fid,
            "kind": "risk-assessment",
            "title": title,
            "status": "active",
            "fm_range": fm_range,
            "invariants": invariants,
        })
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_roadmap(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "roadmap"
    for f in sorted(d.glob("*.md")):
        if f.name == "index.md":
            continue
        content = read_file(f)
        if has_frontmatter(content):
            continue
        title = title_from_h1(content)
        fid = ""
        m = re.match(r"(RM-\d+)", f.stem)
        if m:
            fid = m.group(1)

        status = extract_bold(content, "Status") or "active"
        variant = extract_bold(content, "Variant") or ""

        fm_fields = {
            "kind": "roadmap",
            "title": title,
            "status": status,
        }
        if fid:
            fm_fields = {"id": fid, **fm_fields}
        if variant:
            fm_fields["phase"] = variant
        fm_fields["dependencies"] = []

        fm = build_frontmatter(fm_fields)
        content = remove_bold_line(content, "Status")
        content = remove_bold_line(content, "Variant")
        content = remove_bold_line(content, "Last Updated")
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_process(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "process"
    for f in sorted(d.glob("*.md")):
        if f.name == "index.md":
            continue
        content = read_file(f)
        if has_frontmatter(content):
            continue
        title = title_from_h1(content)

        fm = build_frontmatter({
            "kind": "process",
            "title": title,
            "status": "active",
        })
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_product(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "product"
    if not d.exists():
        return 0
    for f in sorted(d.glob("*.md")):
        if f.name == "index.md":
            continue
        content = read_file(f)
        if has_frontmatter(content):
            continue
        title = title_from_h1(content)

        fm = build_frontmatter({
            "kind": "product",
            "title": title,
            "status": "active",
        })
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_plugins(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "plugins"
    if not d.exists():
        return 0
    for f in sorted(d.glob("PLG-*.md")):
        content = read_file(f)
        if has_frontmatter(content):
            continue
        fid = f.stem  # PLG-gxp etc.
        title = title_from_h1(content)

        # Extract metadata
        behaviors_added = list(set(re.findall(r"BEH-SF-\d+", content)))
        behaviors_added.sort()

        fm = build_frontmatter({
            "id": fid,
            "kind": "plugin",
            "title": title,
            "status": "active",
            "activation": "plugin configuration",
            "plugin_type": "extension",
            "behaviors_added": behaviors_added,
        })
        # Remove plugin metadata block
        content = remove_bold_line(content, "Plugin Metadata")
        content = remove_bold_line(content, "Source chapters")
        content = remove_bold_line(content, "ADRs")
        content = remove_bold_line(content, "Types")
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_compliance(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "compliance"
    if not d.exists():
        return 0
    for f in sorted(d.glob("*.md")):
        if f.name == "index.md":
            continue
        content = read_file(f)
        if has_frontmatter(content):
            continue
        title = title_from_h1(content)

        fm = build_frontmatter({
            "kind": "compliance",
            "title": title,
            "status": "active",
            "regulations": ["21 CFR Part 11", "EU GMP Annex 11", "GAMP 5"],
        })
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_type_system(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "type-system"
    if not d.exists():
        return 0
    for f in sorted(d.glob("*.md")):
        if f.name == "index.md":
            continue
        content = read_file(f)
        if has_frontmatter(content):
            continue
        title = title_from_h1(content)

        invariants = list(set(re.findall(r"INV-SF-\d+", content)))
        invariants.sort()
        adrs = list(set(re.findall(r"ADR-\d+", content)))
        adrs.sort()

        fm = build_frontmatter({
            "kind": "type-system",
            "title": title,
            "status": "active",
            "invariants": invariants,
            "adrs": adrs,
        })
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_features(spec_dir: Path) -> int:
    count = 0
    d = spec_dir / "features"
    if not d.exists():
        return 0
    for f in sorted(d.glob("FEAT-*.md")):
        content = read_file(f)
        if has_frontmatter(content):
            continue
        fid = id_from_filename(f)
        title = title_from_h1(content)
        title = re.sub(r"^FEAT-SF-\d+:\s*", "", title)

        status = extract_bold(content, "Status") or "active"
        adrs_raw = extract_bold(content, "ADRs")
        adrs = extract_link_ids(adrs_raw) if adrs_raw else []
        behaviors = list(set(re.findall(r"BEH-SF-\d+", content)))
        behaviors.sort()

        fm = build_frontmatter({
            "id": fid,
            "kind": "feature",
            "title": title,
            "status": status,
            "adrs": adrs,
            "behaviors": behaviors,
        })
        content = remove_bold_line(content, "Status")
        content = remove_bold_line(content, "ADRs")
        content = inject_frontmatter(content, fm)
        write_file(f, content)
        count += 1
        print(f"  + {f.name}")
    return count

def process_singletons(spec_dir: Path) -> int:
    count = 0

    # overview.md
    f = spec_dir / "overview.md"
    if f.exists():
        content = read_file(f)
        if not has_frontmatter(content):
            pkg = extract_bold(content, "Package") or "@hex-di/specforge"
            pkg = pkg.strip("`")
            status = extract_bold(content, "Status") or "Draft"
            version = extract_bold(content, "Spec Version") or "1.0"

            fm = build_frontmatter({
                "kind": "overview",
                "package": pkg,
                "status": status,
                "version": version,
            })
            content = remove_bold_line(content, "Package")
            content = remove_bold_line(content, "Status")
            content = remove_bold_line(content, "Spec Version")
            content = inject_frontmatter(content, fm)
            write_file(f, content)
            count += 1
            print(f"  + overview.md")

    # glossary.md
    f = spec_dir / "glossary.md"
    if f.exists():
        content = read_file(f)
        if not has_frontmatter(content):
            fm = build_frontmatter({
                "kind": "glossary",
                "package": "@hex-di/specforge",
                "status": "active",
            })
            content = inject_frontmatter(content, fm)
            write_file(f, content)
            count += 1
            print(f"  + glossary.md")

    return count

# --- Main -------------------------------------------------------------------

def main():
    print(f"Spec dir: {SPEC_DIR}")
    if DRY_RUN:
        print("DRY RUN — no files will be modified\n")

    total = 0
    handlers = [
        ("decisions", process_decisions),
        ("invariants", process_invariants),
        ("research", process_research),
        ("behaviors", process_behaviors),
        ("types", process_types),
        ("architecture", process_architecture),
        ("traceability", process_traceability),
        ("risk-assessment", process_risk_assessment),
        ("roadmap", process_roadmap),
        ("process", process_process),
        ("product", process_product),
        ("plugins", process_plugins),
        ("compliance", process_compliance),
        ("type-system", process_type_system),
        ("features", process_features),
        ("singletons", process_singletons),
    ]

    for name, handler in handlers:
        print(f"\n--- {name} ---")
        n = handler(SPEC_DIR)
        total += n
        print(f"  ({n} files)")

    print(f"\n=== Total: {total} files processed ===")

if __name__ == "__main__":
    main()
