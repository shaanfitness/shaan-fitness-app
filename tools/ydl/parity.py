"""YDL parity check: every label YDL shows (headings, columns, fields, dropdown options, buttons, cards, filters)
looked up in our app's source, page by page. Prints what isn't found anywhere, so wording gaps and missing pieces
show up. Usage: python3 tools/ydl/parity.py [--json out.json]"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ydl = json.loads((ROOT / "docs/ydl/ydl-admin-structure.json").read_text())

# Our side: all app source, the dropdown seeds and the database setup (lists live there too).
corpus_files = [p for p in (ROOT / "src").rglob("*") if p.suffix in (".ts", ".tsx", ".json") and "/site/" not in str(p)]
corpus_files += list((ROOT / "supabase").rglob("*.sql"))
norm = lambda s: re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", s.lower())).strip()
corpus = " ".join(norm(p.read_text(errors="ignore")) for p in corpus_files)
corpus_compact = corpus.replace(" ", "")

# YDL page -> our route, from the staff menu.
nav = (ROOT / "src/nav.ts").read_text()
route = {m.group(2): m.group(1) for m in re.finditer(r"p\('[^']*', '([^']+)', '([^']+)'", nav)}

SKIP = {norm(x) for x in ["Reset Password", "Log Out", "Submit", "Search", "Actions", "Action", "Go!", "View", "Delete",
                          "Edit", "Close", "Cancel", "Save", "Yes", "No", "Filters", "Filter", "Export to CSV", "#", "Select"]}

def clean(s):
    s = re.sub(r"\(\s*[#0-9][^)]*\)", "", s or "")          # counts like (137) or (Total: #)
    s = re.sub(r":\s*#.*$", "", s)
    s = re.sub(r"\d{1,2} [A-Z][a-z]+ \d{4}", "", s)          # dates in option text
    s = re.sub(r"\{[^}]*\}", "", s)
    return s.strip(" -:·")

def labels(p):
    out = []
    out += [("heading", h) for h in p.get("headings", [])]
    out += [("tab", t if isinstance(t, str) else t.get("label", "")) for t in p.get("tabs", [])]
    for t in p.get("tables", []):
        out += [("column", c) for c in t.get("cols", [])]
    out += [("card", c if isinstance(c, str) else c.get("label", "")) for c in p.get("cards", [])]
    out += [("filter", l) for l in p.get("labels", [])]
    out += [("action", a) for a in p.get("actions", [])]
    forms = list(p.get("forms", [])) + [{"items": m.get("fields", []), "modal": m.get("title")} for m in p.get("modals", [])]
    for f in forms:
        if f.get("modal"): out.append(("popup", f["modal"]))
        for it in f.get("items", []):
            if "button" in it: out.append(("button", it["button"])); continue
            if "section" in it: out.append(("section", it["section"])); continue
            lab = it.get("label") or ""
            if lab: out.append(("field", lab))
            opts = it.get("options")
            if isinstance(opts, list):
                for o in opts:
                    out.append(("option", o.get("t", "") if isinstance(o, dict) else str(o)))
    seen, res = set(), []
    for kind, text in out:
        c = clean(text)
        n = norm(c)
        if not n or n in SKIP or len(n) < 3 or n.isdigit() or (kind, n) in seen: continue
        seen.add((kind, n))
        res.append((kind, c))
    return res

report = {}
for url, p in ydl["pages"].items():
    miss = [(k, t) for k, t in labels(p) if norm(t) not in corpus and norm(t).replace(" ", "") not in corpus_compact]
    if miss: report[url] = {"route": route.get(url, ""), "missing": miss}

if "--json" in sys.argv:
    Path(sys.argv[sys.argv.index("--json") + 1]).write_text(json.dumps(report, indent=1))
total = sum(len(v["missing"]) for v in report.values())
print(f"{len(ydl['pages'])} YDL pages; {len(report)} with labels not found in our app; {total} labels in all\n")
for url, v in report.items():
    print(f"## {url}  ->  {v['route'] or '(detail/other)'}")
    for k, t in v["missing"]:
        print(f"   [{k}] {t}")
