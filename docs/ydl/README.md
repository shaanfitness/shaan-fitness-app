# YDL reference (structure only)

This folder holds the reference we build the Shaan Fitness replica from. It was read from the YDL admin
dashboard on 8 Oct 2026, without changing anything there.

- `ydl-admin-structure.json` — every YDL admin page (152 menu links plus the detail pages they open):
  headings, tabs, form fields in order (label, field name, type, required, dropdown options), filters,
  table columns, buttons, pop-ups and the links each list opens. `menu` is YDL's exact menu tree, in YDL's order.
- `PAGES.md` — the same, as a readable page-by-page list. Rebuild it with `python3 scripts/ydl-index.py`.

No client or staff data is kept: names, phone numbers, emails, addresses, amounts and per-row values were
removed, and lists of people are shown only as counts such as `{17 people/records}`.
