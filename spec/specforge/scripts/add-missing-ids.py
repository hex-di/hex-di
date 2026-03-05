#!/usr/bin/env python3
"""Add missing 'id' fields to frontmatter in architecture/, process/, product/, types/ files."""
import os
import sys
import re

SPEC_DIR = os.path.join(os.path.dirname(__file__), '..')

# ID prefix and counter per directory
ID_SCHEMES = {
    'architecture': 'ARCH-SF',
    'process': 'PROC-SF',
    'product': 'PROD-SF',
    'types': 'TYPE-SF',
}

def get_frontmatter(content):
    """Return (frontmatter_str, body_str) or (None, content) if no frontmatter."""
    if not content.startswith('---\n'):
        return None, content
    end = content.find('\n---\n', 4)
    if end == -1:
        return None, content
    fm = content[4:end]
    body = content[end+5:]
    return fm, body

def has_id_field(fm_str):
    return bool(re.search(r'^id:', fm_str, re.MULTILINE))

def add_id_to_frontmatter(fm_str, id_val):
    # Insert id as the first field
    return f'id: {id_val}\n{fm_str}'

def process_directory(dirname, prefix, dry_run=False):
    dirpath = os.path.join(SPEC_DIR, dirname)
    if not os.path.isdir(dirpath):
        print(f"  Skipping {dirname}/ (not found)")
        return 0

    files = sorted([
        f for f in os.listdir(dirpath)
        if f.endswith('.md') and f != 'index.md'
    ])

    count = 0
    for i, fname in enumerate(files, start=1):
        filepath = os.path.join(dirpath, fname)
        with open(filepath, 'r') as f:
            content = f.read()

        fm, body = get_frontmatter(content)
        if fm is None:
            continue
        if has_id_field(fm):
            continue

        id_val = f'{prefix}-{i:03d}'
        new_fm = add_id_to_frontmatter(fm, id_val)
        new_content = f'---\n{new_fm}\n---\n{body}'

        if dry_run:
            print(f'  [DRY RUN] {dirname}/{fname} -> {id_val}')
        else:
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f'  {dirname}/{fname} -> {id_val}')
        count += 1

    return count

def main():
    dry_run = '--dry-run' in sys.argv
    total = 0
    for dirname, prefix in ID_SCHEMES.items():
        print(f'\n--- {dirname}/ ---')
        n = process_directory(dirname, prefix, dry_run)
        total += n
        print(f'  {n} files updated')
    print(f'\nTotal: {total} files {"would be " if dry_run else ""}updated')

if __name__ == '__main__':
    main()
