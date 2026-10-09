"""Click-through of YDL coupons, combo offers, trainers, staff, access control, targets, leave,
transformations, payroll, expenses and vendors against the local test stack (fresh stack).
Usage: python3 scripts/e2e-team.py <base-url> <out-dir>"""
import base64
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-team")
OUT.mkdir(parents=True, exist_ok=True)
IMG = OUT / "before-after.png"
IMG.write_bytes(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8Dwn4GBgYGJAQoAADwAA/2l3Q8AAAAASUVORK5CYII="))
errors: list[str] = []
step = 0


def shot(page, name):
    global step
    step += 1
    page.screenshot(path=str(OUT / f"{step:02d}-{name}.png"), full_page=True)


def toast(page, text):
    expect(page.get_by_text(text, exact=False).first).to_be_visible(timeout=8000)


def row_action(page, row_text, action):
    page.get_by_role("row").filter(has_text=row_text).first.get_by_role("button", name="Actions").click()
    page.get_by_role("menuitem", name=action).click()


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and "ERR_TUNNEL" not in m.text and "Failed to load resource" not in m.text and errors.append(f"console: {m.text}"))
    page.on("response", lambda r: r.status >= 400 and errors.append(f"{r.status} {r.request.method} {r.url[:140]}"))
    page.goto(BASE + "/login")
    page.fill("#email", "shaanfitnessgym@gmail.com")
    page.fill("#password", "local-test")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/dashboard")

    # Coupons ------------------------------------------------------------------------------------
    page.goto(BASE + "/coupons/new")
    page.fill("#cname", "Diwali Offer")
    page.fill("#ccode", "diwali15")
    page.select_option("#ctype", "percentage")
    page.fill("#cdisc", "15")
    page.select_option("#cwho", "both")
    page.fill("#cmin", "2000")
    shot(page, "create-coupon")
    page.get_by_role("button", name="Save & Close").click()
    page.wait_for_url("**/coupons")
    toast(page, "Coupon created")
    expect(page.get_by_text("DIWALI15")).to_be_visible()
    row_action(page, "DIWALI15", "Deactivate")
    page.get_by_role("dialog").get_by_role("button", name="Yes").click()
    toast(page, "1 coupon deactivated")
    shot(page, "coupon-list")

    # Combo offer ----------------------------------------------------------------------------------
    page.goto(BASE + "/combos/new")
    page.fill("#coname", "Couple Combo")
    page.select_option("#coplans", index=[0, 1])
    page.get_by_role("button", name="Add", exact=True).click()
    page.locator("table input[type=number]").first.fill("3999")
    shot(page, "create-combo")
    page.get_by_role("button", name="Submit").click()
    page.wait_for_url("**/combos")
    toast(page, "Combo offer created")
    expect(page.get_by_text("Couple Combo")).to_be_visible()

    # Trainers -------------------------------------------------------------------------------------
    page.goto(BASE + "/trainers")
    expect(page.get_by_role("heading", name="My Trainers Listing (Max Limit : 1000)")).to_be_visible()
    row_action(page, "Ravi Teja", "Check In")
    toast(page, "Checked in")
    row_action(page, "Sunitha Rao", "Add Time")
    dlg = page.get_by_role("dialog")
    dlg.locator("#tin").fill("2026-10-01T06:00")
    dlg.locator("#tout").fill("2026-10-01T13:00")
    dlg.get_by_role("button", name="Confirm").click()
    toast(page, "Time added")
    shot(page, "trainer-list")
    page.get_by_role("main").get_by_role("link", name="Add Trainer").click()
    page.wait_for_url("**/trainers/new")
    page.fill("#pfirst", "Kiran")
    page.get_by_placeholder("Last name").fill("Varma")
    page.fill("#pemail", "kiran.coach@example.com")
    page.fill("#ppass", "secret123")
    page.fill("#pphone", "9100000077")
    page.fill("#pdob", "1994-05-05")
    page.get_by_label("Male", exact=True).check()
    page.get_by_label("Personal Trainer", exact=True).check()
    page.get_by_role("group", name="Trainer Services *").get_by_label("Weight Training").check()
    page.fill("#ppay", "25000")
    shot(page, "add-trainer")
    page.get_by_role("button", name="Save", exact=True).click()
    page.wait_for_url("**/trainers")
    toast(page, "Trainer saved")
    expect(page.get_by_role("row").filter(has_text="Kiran Varma").get_by_text("Linked")).to_be_visible()

    # Staff accounts and access control -------------------------------------------------------------
    page.goto(BASE + "/staff")
    expect(page.get_by_role("heading", name="Staff Accounts Listing")).to_be_visible()
    shot(page, "staff-list")
    page.goto(BASE + "/staff/new")
    page.fill("#pfirst", "Divya")
    page.get_by_placeholder("Last name").fill("Sri")
    page.fill("#pemail", "divya.sales@example.com")
    page.fill("#ppass", "secret123")
    page.fill("#pphone", "9100000078")
    page.fill("#pdob", "1998-02-02")
    page.get_by_label("Female", exact=True).check()
    page.get_by_role("group", name="Employee Type").get_by_label("Sales", exact=True).check()
    shot(page, "add-staff")
    page.get_by_role("button", name="Save", exact=True).click()
    page.wait_for_url("**/staff")
    toast(page, "Staff account saved")
    expect(page.get_by_role("row").filter(has_text="Divya Sri").get_by_role("cell", name="Sales", exact=True)).to_be_visible()
    page.goto(BASE + "/staff/access")
    expect(page.get_by_role("heading", name="Staff Accounts Access Control Listing")).to_be_visible()
    page.get_by_role("checkbox", name="Coupon (Create/Edit/View): Front Desk Executive").check()
    shot(page, "access-control")
    page.get_by_role("button", name="Save").first.click()
    toast(page, "Access control saved")

    # Targets ----------------------------------------------------------------------------------------
    page.goto(BASE + "/staff/targets")
    page.get_by_role("button", name="Add Target").click()
    dlg = page.get_by_role("dialog")
    dlg.locator("#tgp").select_option(index=1)
    dlg.locator("#tgc").select_option("flat")
    dlg.locator("#tg0").fill("1000")
    dlg.locator("#tc0").fill("100")
    dlg.locator("#tg1").fill("50000")
    dlg.locator("#tc1").fill("1000")
    dlg.get_by_role("button", name="Add Target").click()
    toast(page, "Target added")
    shot(page, "targets")

    # Leave ------------------------------------------------------------------------------------------
    page.goto(BASE + "/trainers/leave")
    page.get_by_role("button", name="Request Leave").click()
    dlg = page.get_by_role("dialog")
    dlg.locator("#lvstaff").select_option(label="Ravi Teja")
    dlg.locator("#lvr").fill("Sister's wedding")
    dlg.get_by_role("button", name="Request").click()
    toast(page, "Leave requested")
    page.get_by_role("checkbox", name="Select Ravi Teja").check()
    page.get_by_role("button", name="Approve as paid").click()
    page.get_by_role("dialog").get_by_role("button", name="Yes").click()
    toast(page, "approved as paid")
    shot(page, "leave")

    # Transformations ----------------------------------------------------------------------------------
    page.goto(BASE + "/trainers/transformations")
    page.get_by_role("button", name="Add Transformations").click()
    dlg = page.get_by_role("dialog")
    dlg.locator("#trimg").set_input_files(str(IMG))
    dlg.locator("#trname").fill("Ravi T.")
    dlg.locator("#trper").fill("12")
    dlg.locator("#trtrainer").select_option(label="Ravi Teja")
    dlg.locator("#trtitle").fill("Fat loss")
    dlg.locator("#trdesc").fill("Lost 8 kg in 12 weeks with three sessions a week.")
    dlg.get_by_role("button", name="Submit").click()
    expect(dlg.get_by_role("alert")).to_contain_text("Confirm the client agreed")
    dlg.get_by_label("The client agreed", exact=False).check()
    dlg.get_by_role("button", name="Submit").click()
    toast(page, "Transformation added")
    shot(page, "transformations")

    # Payroll ----------------------------------------------------------------------------------------
    page.goto(BASE + "/payroll")
    expect(page.get_by_role("heading", name="Payroll Calculator")).to_be_visible()
    expect(page.get_by_text("Kiran Varma").first).to_be_visible(timeout=8000)
    page.get_by_role("checkbox", name="Select Kiran Varma").check()
    page.get_by_role("button", name="Add to Payroll Register").click()
    page.get_by_role("dialog").get_by_role("button", name="Add").click()
    toast(page, "added to the payroll register")
    shot(page, "payroll")
    page.goto(BASE + "/payroll/register")
    expect(page.get_by_role("cell", name="Kiran Varma").first).to_be_visible(timeout=8000)
    shot(page, "payroll-register")

    # Expenses and vendors ------------------------------------------------------------------------------
    page.goto(BASE + "/vendors")
    page.get_by_role("button", name="Add Vendor").click()
    dlg = page.get_by_role("dialog")
    dlg.locator("#vn").fill("Tea Vendor")
    dlg.locator("#vc").fill("Raju")
    dlg.locator("#v1").fill("9000000999")
    dlg.locator("#vnote").fill("Tea twice a day")
    dlg.get_by_role("button", name="Add Vendor").click()
    toast(page, "Vendor added")
    page.goto(BASE + "/expenses")
    expect(page.get_by_text("Salary · Kiran Varma", exact=False).first).to_be_visible(timeout=8000)
    page.get_by_role("button", name="Add Expense").click()
    dlg = page.get_by_role("dialog")
    dlg.locator("#ex-t").fill("October tea")
    dlg.locator("#ex-v").select_option(label="Tea Vendor")
    dlg.locator("#ex-c").select_option("Food bevarages")
    dlg.locator("#ex-m").select_option("CASH")
    dlg.locator("#ex-a").fill("1200")
    dlg.locator("#ex-n").fill("Paid for the month")
    dlg.get_by_role("button", name="Add Expense").click()
    toast(page, "Expense added")
    shot(page, "expenses")

    # Front desk executive (Asha): no coupons, no payroll, no CSV ---------------------------------------
    page.goto(BASE + "/dashboard")
    page.evaluate("localStorage.clear()")
    page.goto(BASE + "/login")
    page.fill("#email", "desk@example.com")
    page.fill("#password", "local-test")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/dashboard")
    page.goto(BASE + "/payroll")
    expect(page.get_by_text("doesn’t have access to this page")).to_be_visible(timeout=8000)
    page.goto(BASE + "/coupons")
    expect(page.get_by_role("heading", name="Coupon Listing")).to_be_visible(timeout=8000)
    page.goto(BASE + "/members")
    page.wait_for_timeout(1200)
    expect(page.get_by_role("button", name="Export to CSV")).to_have_count(0)
    shot(page, "desk-members-no-csv")
    browser.close()

print("\n".join(errors) if errors else "no console errors")
print("e2e passed")
