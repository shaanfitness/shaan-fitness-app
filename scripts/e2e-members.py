"""Click-through of the YDL member flows against the local test stack:
add a member, sell a plan, take part and full payments, freeze, extend, upgrade, medical
history, check in/out, quick billing, and every Part 1 list page.
Usage: python3 scripts/e2e-members.py <base-url> <out-dir>"""
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-e2e")
OUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
step = 0


def shot(page, name):
    global step
    step += 1
    page.screenshot(path=str(OUT / f"{step:02d}-{name}.png"), full_page=True)


def toast(page, text):
    expect(page.get_by_text(text, exact=False).first).to_be_visible(timeout=8000)


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and errors.append(f"console: {m.text}"))
    page.goto(BASE + "/login")
    page.fill("#email", "shaanfitnessgym@gmail.com")
    page.fill("#password", "local-test")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/dashboard")

    # Add Member -------------------------------------------------------------------------
    page.goto(BASE + "/members/new")
    expect(page.get_by_role("heading", name="Add Member")).to_be_visible()
    page.fill("#first", "Ravi")
    page.fill("#last", "Teja")
    page.fill("#mobile", "9988776655")
    page.get_by_label("Male", exact=True).check()
    page.fill("#dob", "1995-04-12")
    shot(page, "add-member")
    page.get_by_role("button", name="Save", exact=True).click()
    page.wait_for_url("**/clients/*")
    expect(page.get_by_role("heading", name="Ravi Teja")).to_be_visible()
    expect(page.get_by_text("Enquiry", exact=True).first).to_be_visible()
    shot(page, "profile-new")

    # Add Subscription -------------------------------------------------------------------
    page.get_by_role("button", name="Add Subscription", exact=True).click()
    dlg = page.get_by_role("dialog")
    dlg.locator("#plan-1").select_option(index=1)
    shot(page, "add-subscription")
    dlg.get_by_role("button", name="Add Subscription").click()
    page.wait_for_url("**/payments/*")
    expect(page.get_by_role("heading", name="Payments Details")).to_be_visible()
    shot(page, "payments-details")

    # Part payment needs the next due date
    page.fill("#ramt", "1000")
    page.get_by_role("button", name="Save", exact=True).click()
    expect(page.get_by_role("alert").filter(has_text="Choose the next balance due date")).to_be_visible()
    page.fill("#rnext", "2026-12-31")
    page.select_option("#rmode", "UPI")
    page.get_by_role("button", name="Save", exact=True).click()
    toast(page, "Payment received")
    expect(page.get_by_role("cell", name="1,000.00").first).to_be_visible()
    # Pay the rest
    expect(page.locator("#ramt")).to_have_value("3999")
    page.get_by_role("button", name="Save", exact=True).click()
    toast(page, "Payment received")
    expect(page.locator("td .chip-green", has_text="Paid").first).to_be_visible()
    shot(page, "paid")

    # Back to the profile: now a member, freeze / extend / upgrade -------------------------
    page.get_by_role("link", name="Ravi Teja").first.click()
    page.wait_for_url("**/clients/*")
    expect(page.get_by_text("Member", exact=True).first).to_be_visible()
    page.get_by_role("button", name="Freeze", exact=True).click()
    dlg = page.get_by_role("dialog")
    dlg.locator("#sub").select_option(index=1)
    dlg.locator("#fdays").fill("3")
    dlg.get_by_role("button", name="Freeze Subscription").click()
    toast(page, "Subscription frozen")
    page.get_by_role("button", name="Extension", exact=True).click()
    dlg = page.get_by_role("dialog")
    dlg.locator("#sub").select_option(index=1)
    dlg.locator("#edays").fill("2")
    dlg.get_by_role("button", name="Extend Subscription").click()
    toast(page, "Subscription extended")
    page.get_by_role("button", name="Upgrade", exact=True).click()
    dlg = page.get_by_role("dialog")
    dlg.locator("#sub").select_option(index=1)
    dlg.locator("#newplan").select_option(index=1)
    shot(page, "upgrade")
    dlg.get_by_role("button", name="Upgrade Subscription").click()
    page.wait_for_url("**/payments/*")
    shot(page, "upgrade-payment")
    page.go_back()
    page.wait_for_url("**/clients/*")

    # Medical history, check in / out ------------------------------------------------------
    page.get_by_role("button", name="Edit Medical Details").click()
    dlg = page.get_by_role("dialog")
    for radio in dlg.get_by_role("radio", name="No").all():
        radio.check()
    dlg.get_by_role("button", name="Save").click()
    toast(page, "Medical history saved")
    page.get_by_role("button", name="Check in", exact=True).click()
    toast(page, "Checked in")
    page.get_by_role("button", name="Check Out", exact=True).click()
    toast(page, "Checked out")
    shot(page, "profile-member")
    for tab in ["Subscriptions", "Attendance", "Follow Up History", "Client Document", "Client Referrals"]:
        page.get_by_label("Client sections").get_by_role("link", name=tab, exact=True).click()
        page.wait_for_timeout(600)
        shot(page, "tab-" + tab.lower().replace(" ", "-"))
    page.get_by_label("Client sections").get_by_role("link", name="Follow Up History", exact=True).click()
    expect(page.get_by_role("cell", name="Balance due").first).to_be_visible()

    # Quick Billing ------------------------------------------------------------------------
    page.goto(BASE + "/quick-billing")
    page.fill("#qf", "Lakshmi")
    page.get_by_placeholder("Last name").fill("Devi")
    page.fill("#qe", "lakshmi@example.com")
    page.fill("#qm", "9876501234")
    page.get_by_label("Female", exact=True).check()
    page.select_option("#bp", index=1)
    shot(page, "quick-billing")
    page.get_by_role("button", name="Save & Continue").click()
    page.wait_for_url("**/payments/*")
    expect(page.locator("td .chip-green", has_text="Paid").first).to_be_visible()

    # Lists ----------------------------------------------------------------------------------
    for path, check in [("/members", "My Members Listing"), ("/clients", "Clients List"), ("/members/birthdays", "Members Birthday Listing"),
                        ("/clients/referrals", "Client Referrals List"), ("/members/other-branches", "Other Branch Member"),
                        ("/plans", "Active Membership plans Listing"), ("/plans/new", "Membership Plans"), ("/subscriptions", "Subscriptions Listing"),
                        ("/members/quick", "Add Member Information")]:
        page.goto(BASE + path)
        expect(page.get_by_role("heading", name=check).first).to_be_visible(timeout=8000)
        page.wait_for_timeout(700)
        shot(page, path.strip("/").replace("/", "-"))

    # Phone size for the profile
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(BASE + "/members")
    page.wait_for_timeout(800)
    shot(page, "members-phone")
    browser.close()

print("\n".join(errors) if errors else "no console errors")
print("e2e passed")
