"""Screenshots of the live pages for each role, phone and laptop sizes, against the
local test stack (scripts/local-stack.sh) — made-up data, local login only.
Usage: python3 scripts/screenshots.py <base-url> <out-dir> [only-substring]
Needs: scripts/local-stack.sh start, then the app running against it (npm run dev with
VITE_SUPABASE_URL=http://127.0.0.1:54321 and the local anon key)."""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots")
ONLY = sys.argv[3] if len(sys.argv) > 3 else ""
OUT.mkdir(parents=True, exist_ok=True)

# Local test logins from scripts/local-api/demo-data.sql (the local API accepts any password).
USERS = {
    "owner": "shaanfitnessgym@gmail.com",
    "desk": "desk@example.com",
    "coach": "coach@example.com",
    "doctor": "doctor@example.com",
}

PLAN = [
    (None, "/login", "phone"),
    ("owner", "/dashboard", "laptop"),
    ("owner", "/dashboard", "phone"),
    ("owner", "/enquiries", "laptop"),
    ("owner", "/enquiries", "phone"),
    ("owner", "/enquiries/new", "laptop"),
    ("owner", "/enquiries/new", "phone"),
    ("owner", "/follow-ups", "laptop"),
    ("owner", "/follow-ups", "phone"),
    ("owner", "/settings/lists", "laptop"),
    ("owner", "/registers/receipts", "laptop"),
    ("owner", "/menu", "phone"),
    ("owner", "/more", "laptop"),
    ("desk", "/dashboard", "laptop"),
    ("coach", "/coach", "phone"),
    ("coach", "/follow-ups", "laptop"),
    ("doctor", "/doctor", "phone"),
]

SIZES = {"phone": {"width": 390, "height": 844}, "laptop": {"width": 1440, "height": 900}}

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for who, path, size in PLAN:
        name = f"{who or 'all'}{path.replace('/', '_')}_{size}.png"
        if ONLY and ONLY not in name:
            continue
        ctx = browser.new_context(viewport=SIZES[size], device_scale_factor=2 if size == "phone" else 1)
        page = ctx.new_page()
        page.on("pageerror", lambda e, path=path: errors.append(f"{path}: {e}"))
        page.on("console", lambda m, path=path: m.type == "error" and errors.append(f"{path}: {m.text}"))
        page.goto(BASE + "/login")
        if who:
            page.fill("#email", USERS[who])
            page.fill("#password", "local-test")
            page.click("button[type=submit]")
            page.wait_for_url(lambda u: "/login" not in u, timeout=15000)
        page.goto(BASE + path)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(600)
        page.screenshot(path=str(OUT / name), full_page=True)
        print("saved", name)
        ctx.close()
    browser.close()

print("errors:", errors or "none")
