"""Screenshots of every screen for each role, phone and laptop sizes.
Usage: python3 scripts/screenshots.py <base-url> <out-dir>
Needs the app running (npm run build && npx vite preview)."""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots")
OUT.mkdir(parents=True, exist_ok=True)

USERS = {
    "owner": {"role": "owner", "name": "Sabir Rasool", "initials": "SR", "staffId": "staff-sabir-owner"},
    "desk": {"role": "front_desk", "name": "Front desk", "initials": "FD", "staffId": "staff-desk"},
    "coach": {"role": "coach", "name": "Second coach", "initials": "SC", "staffId": "staff-coach-2"},
    "doctor": {"role": "doctor", "name": "Studio doctor", "initials": "DR", "staffId": "staff-doctor"},
    "member": {"role": "member", "name": "Ananya Reddy", "initials": "AR", "memberId": "member-ananya"},
}

PLAN = [
    (None, "/login", "phone"),
    ("desk", "/today", "phone"),
    ("desk", "/slots", "phone"),
    ("desk", "/members", "phone"),
    ("desk", "/follow-ups", "phone"),
    ("owner", "/dashboard", "laptop"),
    ("owner", "/dashboard", "phone"),
    ("owner", "/members/member-ananya", "phone"),
    ("coach", "/coach", "phone"),
    ("coach", "/members", "phone"),
    ("doctor", "/doctor", "phone"),
    ("member", "/home", "phone"),
]

SIZES = {"phone": {"width": 390, "height": 844}, "laptop": {"width": 1440, "height": 900}}

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for who, path, size in PLAN:
        ctx = browser.new_context(viewport=SIZES[size], device_scale_factor=2 if size == "phone" else 1)
        page = ctx.new_page()
        page.on("pageerror", lambda e, path=path: errors.append(f"{path}: {e}"))
        page.on("console", lambda m, path=path: m.type == "error" and errors.append(f"{path}: {m.text}"))
        page.goto(BASE + "/login")
        page.evaluate("localStorage.clear()")
        if who:
            page.evaluate(f"localStorage.setItem('sf.session', {json.dumps(json.dumps(USERS[who]))})")
        page.goto(BASE + path)
        page.wait_for_timeout(700)
        name = f"{who or 'all'}{path.replace('/', '_')}_{size}.png"
        page.screenshot(path=str(OUT / name), full_page=True)
        print("saved", name)
        ctx.close()
    browser.close()

print("errors:", errors or "none")
