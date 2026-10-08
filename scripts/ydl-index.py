#!/usr/bin/env python3
"""Builds docs/ydl/PAGES.md, a readable page-by-page index of the YDL admin structure
(docs/ydl/ydl-admin-structure.json), in YDL's own menu order. Run: python3 scripts/ydl-index.py"""
import json
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / 'docs/ydl/ydl-admin-structure.json').read_text())
pages = data['pages']
seen = set()
out = ['# YDL admin, page by page', '',
       'Generated from `ydl-admin-structure.json` by `scripts/ydl-index.py`. Names, contact details and '
       'per-row values were removed during the crawl; only the structure is kept.', '']


def field_line(f):
    if 'section' in f:
        return f"- **{f['section']}**"
    if 'button' in f:
        return f"- [button] {f['button']}"
    bits = [f.get('label') or f.get('placeholder') or '', f"`{f.get('name', '')}`", f.get('type', '')]
    if f.get('required'):
        bits.append('required')
    opts = f.get('options')
    if isinstance(opts, list):
        texts = [o.get('t', '') for o in opts if o.get('t')]
        shown = ', '.join(texts[:25]) + (f' … (+{len(texts) - 25})' if len(texts) > 25 else '')
        bits.append(f'options: {shown}')
    elif isinstance(opts, str):
        bits.append(f'options: {opts}')
    if f.get('default') not in (None, ''):
        bits.append(f"default {f['default']}")
    return '  - ' + ' · '.join(b for b in bits if b)


def page_block(url, label, depth):
    p = pages.get(url)
    if not p:
        return [f"{'#' * depth} {label}", '', f'`{url}` (not captured)', '']
    seen.add(url)
    lines = [f"{'#' * depth} {label}", '', f'`{url}`', '']
    if p.get('headings'):
        lines.append('Headings: ' + ' · '.join(p['headings'][:12]))
    if p.get('tabs'):
        lines.append('Tabs: ' + ' · '.join(p['tabs']))
    shown_tables = []
    for t in p.get('tables') or []:
        cols = list(dict.fromkeys(c for c in t.get('cols', []) if c))
        if cols and cols not in shown_tables:
            shown_tables.append(cols)
            lines.append('Columns: ' + ' | '.join(cols))
    if p.get('labels'):
        lines.append('Filter labels: ' + ' · '.join(p['labels']))
    if p.get('cards'):
        lines.append('Cards: ' + ' · '.join(p['cards'][:30]))
    if p.get('actions'):
        lines.append('Actions: ' + ' · '.join(p['actions'][:60]))
    lines.append('')
    for i, fm in enumerate(p.get('forms') or []):
        items = fm.get('items', []) if isinstance(fm, dict) else []
        if len(items) <= 1:
            continue
        lines.append(f'Form {i + 1}:')
        lines += [field_line(f) for f in items]
        lines.append('')
    if p.get('looseFields'):
        lines.append('Other fields:')
        lines += [field_line(f) for f in p['looseFields']]
        lines.append('')
    for m in p.get('modals') or []:
        title = m.get('title') or '(untitled pop-up)'
        lines.append(f'Pop-up: **{title}**' + (f" — buttons: {', '.join(m['buttons'])}" if m.get('buttons') else ''))
        lines += [field_line(f) for f in m.get('fields') or []]
        lines.append('')
    if p.get('detailLinks'):
        lines.append('Opens: ' + ' · '.join(f'`{u}`' for u in p['detailLinks']))
        lines.append('')
    return lines


def walk(nodes, depth, trail):
    for n in nodes:
        label = ' › '.join(trail + [n['name']])
        if n.get('href'):
            out.extend(page_block(n['href'], label, min(depth, 4)))
        else:
            out.extend([f"{'#' * min(depth, 4)} {label}", ''])
        if n.get('children'):
            walk(n['children'], depth + 1, trail + [n['name']])


out.append('## Menu')
out.append('')
walk(data['menu'], 2, [])
for label, url in (data.get('extraScreens') or {}).items():
    if url not in seen:
        out.extend(page_block(url, label, 3))
rest = [u for u in pages if u not in seen]
if rest:
    out += ['## Detail pages (opened from the lists above)', '']
    for u in rest:
        out.extend(page_block(u, (pages[u].get('headings') or [u])[0], 3))
(root / 'docs/ydl/PAGES.md').write_text('\n'.join(out) + '\n')
print('pages indexed:', len(seen), 'of which detail pages:', len(rest))
