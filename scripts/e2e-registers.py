"""Opens every account register against the local test stack, checks it loads without an
error, tries its filters panel and CSV export, and records/deletes a PT session.
Run after scripts/e2e-members.py (which creates the bills these registers list).
Usage: python3 scripts/e2e-registers.py <base-url> <out-dir>"""
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-registers")
OUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []

PAGES = ["collection", "receipts", "subscriptions", "cash", "sessions", "recorded-sessions", "deleted-sessions", "coupons", "expired",
         "expired-sessions", "balance-due", "tax", "write-offs", "deleted-subscriptions", "trials", "cancelled", "transfers", "freezes",
         "upgrades", "extensions", "downgrades", "course-orders", "receipt-log", "recurring"]

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and "ERR_TUNNEL" not in m.text and errors.append(f"console: {m.text}"))
    page.goto(BASE + "/login")
    page.fill("#email", "shaanfitnessgym@gmail.com")
    page.fill("#password", "local-test")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/dashboard")

    for i, name in enumerate(PAGES, 1):
        page.goto(f"{BASE}/registers/{name}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(500)
        alerts = page.get_by_role("alert").all_inner_texts()
        bad = [a for a in alerts if a.strip()]
        if bad:
            errors.append(f"{name}: {bad}")
        if page.get_by_role("button", name="Export to CSV").count():
            with page.expect_download() as dl:
                page.get_by_role("button", name="Export to CSV").first.click()
            if not dl.value.suggested_filename.endswith(".csv"):
                errors.append(f"{name}: no csv")
        if page.get_by_role("button", name="Filters").count():
            page.get_by_role("button", name="Filters").first.click()
            page.get_by_role("dialog").get_by_role("checkbox").first.check()
            page.get_by_role("dialog").get_by_role("button", name="Apply").click()
            page.wait_for_timeout(400)
            if [a for a in page.get_by_role("alert").all_inner_texts() if a.strip()]:
                errors.append(f"{name}: filter error")
        page.screenshot(path=str(OUT / f"{i:02d}-{name}.png"), full_page=True)

    # Session register for one PT subscription: deduct, then delete it.
    page.goto(f"{BASE}/registers/sessions")
    page.wait_for_load_state("networkidle")
    page.get_by_role("button", name="Actions").first.click()
    page.get_by_role("menuitem", name="Go to Sessions").click()
    page.wait_for_url("**subscription=*")
    page.fill("#sact", "Upper body")
    page.get_by_role("button", name="Deduct Session").click()
    expect(page.get_by_role("cell", name="Upper body")).to_be_visible()
    page.get_by_role("button", name="Delete").first.click()
    page.get_by_role("dialog").locator("#dreason").fill("Test")
    page.get_by_role("dialog").get_by_role("button", name="Delete").click()
    expect(page.get_by_text("Session deleted")).to_be_visible()
    page.screenshot(path=str(OUT / "99-session-detail.png"), full_page=True)
    page.goto(f"{BASE}/registers/deleted-sessions")
    expect(page.get_by_text("Test").first).to_be_visible()
    browser.close()

print("\n".join(errors) if errors else "no errors")
print("registers checked")
