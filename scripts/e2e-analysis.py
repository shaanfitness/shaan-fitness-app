"""Click-through of YDL's twenty analysis reports against the local test stack (fresh stack):
every page loads without errors, filters and This v/s That pickers refetch, charts answer hover,
tables open from charts, CSV exports download, and a front desk executive sees only her pages.
Usage: python3 scripts/e2e-analysis.py <base-url> <out-dir>"""
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-analysis")
OUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
step = 0


def shot(page, name):
    global step
    step += 1
    page.screenshot(path=str(OUT / f"{step:02d}-{name}.png"), full_page=True)


def open_page(page, path, heading):
    page.goto(BASE + "/analysis/" + path)
    expect(page.get_by_role("heading", name=heading, exact=True).first).to_be_visible(timeout=10000)
    expect(page.get_by_text("Loading…")).to_have_count(0, timeout=10000)
    expect(page.get_by_role("alert")).to_have_count(0)


def csv(page, name="Export to CSV"):
    with page.expect_download() as d:
        page.get_by_role("button", name=name).first.click()
    assert d.value.suggested_filename.endswith(".csv"), d.value.suggested_filename


def login(page, email):
    page.goto(BASE + "/login")
    page.fill("#email", email)
    page.fill("#password", "local-test")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/dashboard")


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and "ERR_TUNNEL" not in m.text and "Failed to load resource" not in m.text and errors.append(f"console: {m.text}"))
    page.on("response", lambda r: r.status >= 400 and errors.append(f"{r.status} {r.request.method} {r.url[:140]}"))
    login(page, "shaanfitnessgym@gmail.com")

    # Traffic: filter panel, hover tooltip, chart as a table ---------------------------------------
    open_page(page, "traffic", "Traffic Analysis")
    expect(page.get_by_text("Current Traffic Rate")).to_be_visible()
    chart = page.get_by_role("img", name="Check-ins per day. Use the arrow keys to read each value.")
    box = chart.bounding_box()
    page.mouse.move(box["x"] + box["width"] * 0.6, box["y"] + box["height"] / 2)
    expect(page.get_by_role("status").filter(has_text="2026").first).to_be_visible()
    page.get_by_text("Show as table").first.click()
    expect(page.get_by_role("table", name="Check-ins per day")).to_be_visible()
    page.get_by_role("button", name="Traffic Filter").click()
    page.get_by_role("checkbox", name="Total Males").check()
    page.get_by_role("button", name="Apply").click()
    expect(page.get_by_role("button", name="Traffic Filter (1)")).to_be_visible()
    expect(page.locator('li[title="Female: 0"]')).to_be_visible()
    page.get_by_label("Week", exact=True).select_option("last")
    expect(page.get_by_role("heading", name="Weekly Data")).to_be_visible()
    shot(page, "traffic")

    # Members, enquiry stages ---------------------------------------------------------------------
    open_page(page, "members", "Members Analysis")
    page.get_by_label("Year", exact=True).select_option("2025")
    expect(page.get_by_text("Members whose first plan started each month of 2025")).to_be_visible()
    shot(page, "members")
    open_page(page, "enquiry-stages", "Enquiry FollowUp Stage Analysis")
    expect(page.get_by_text("Under Trial Stage").first).to_be_visible()
    shot(page, "enquiry-stages")

    # Collection: This v/s That ---------------------------------------------------------------------
    open_page(page, "collection", "Collection Analysis")
    this = page.get_by_role("group", name="This")
    this.get_by_label("Dates", exact=True).select_option("today")
    expect(page.get_by_role("heading", name="Collection Analysis · This").locator("..")).not_to_contain_text("July")
    this.get_by_label("Select Client Rep", exact=True).select_option(label="Asha Kumari")
    expect(page.get_by_role("table", name="Collections by service, This")).to_be_visible()
    shot(page, "collection")

    # Subscriptions: invoice dates, CSV ----------------------------------------------------------------
    open_page(page, "subscriptions", "Subscriptions Analysis")
    expect(page.get_by_role("cell", name="Total", exact=True)).to_be_visible()
    csv(page)
    page.get_by_role("button", name="Choose invoice dates").click()
    page.get_by_label("Invoice Date", exact=True).select_option("last_month")
    page.get_by_role("button", name="All dates").click()
    shot(page, "subscriptions")

    # Follow-ups, conversion, enquiries, enquiry conversion -------------------------------------------
    open_page(page, "follow-ups", "Follow up Analysis")
    page.get_by_label("Due date", exact=True).select_option("last_7")
    expect(page.get_by_text("Total Follow ups").first).to_be_visible()
    csv(page)
    shot(page, "follow-ups")
    open_page(page, "conversion", "Conversion Analysis")
    expect(page.get_by_text("Enquiries who became members")).to_be_visible()
    page.get_by_role("group", name="That").get_by_label("Dates", exact=True).select_option("last_month")
    expect(page.get_by_role("heading", name="Conversion Followup Analysis · That")).to_be_visible()
    shot(page, "conversion")
    open_page(page, "enquiries", "Enquiry Analysis")
    expect(page.get_by_text("Enquiry Location Analysis · This")).to_be_visible()
    shot(page, "enquiries")
    open_page(page, "enquiry-conversion", "Enquiry Conversion Report")
    expect(page.get_by_role("cell", name="Total", exact=True)).to_be_visible()
    csv(page)

    # Money ----------------------------------------------------------------------------------------------
    open_page(page, "expenses", "Expense Analysis")
    page.get_by_role("group", name="This").get_by_label("Dates", exact=True).select_option("last_90")
    expect(page.get_by_role("list", name="Expenses by vendor, This").get_by_text("APEPDCL")).to_be_visible()
    expect(page.get_by_text("Personal Trainer").first).to_be_visible()
    shot(page, "expenses")
    open_page(page, "profit-loss", "Profit & Loss Analysis")
    expect(page.get_by_text("Total Collection").first).to_be_visible()
    shot(page, "profit-loss")

    open_page(page, "billing", "Billing Analysis")
    collected = page.locator(".kpi").filter(has_text="Collections").locator("span").nth(1).inner_text()
    page.get_by_role("button", name="Filters").click()
    page.locator("#bf-mode").select_option("UPI")
    page.get_by_role("button", name="Submit").click()
    expect(page.get_by_role("button", name="Filters (1)")).to_be_visible()
    expect(page.get_by_role("list", name="Collections by mode of payment")).not_to_contain_text("CASH")
    shot(page, "billing")
    open_page(page, "sales-leaderboard", "Sales Leaderboard")
    expect(page.get_by_text("Highest Target Assigned")).to_be_visible()
    csv(page)
    open_page(page, "daily-collection", "Daily Collection Analysis")
    expect(page.get_by_role("link", name="Report in PDF")).to_be_visible()
    page.get_by_label("Month", exact=True).select_option("1")
    expect(page.get_by_text("Total Summary January")).to_be_visible()
    csv(page)
    shot(page, "daily-collection")
    open_page(page, "pt", "PT Analysis")
    expect(page.get_by_role("heading", name="Trainer PT Analysis")).to_be_visible()
    open_page(page, "leaderboard", "Leaderboard")
    expect(page.get_by_role("cell", name="Ravi Teja").first).to_be_visible()
    open_page(page, "revenue-forecast", "Revenue Forecast")
    expect(page.get_by_text("Expected in the next 12 months")).to_be_visible()
    shot(page, "revenue-forecast")
    open_page(page, "weight-loss", "Weight Loss Analysis")
    expect(page.get_by_text("No body measurements are recorded yet")).to_be_visible()
    open_page(page, "lead-sources", "Lead Source Analysis")
    csv(page)
    open_page(page, "branches", "Branch Analysis")
    row = page.get_by_role("row").filter(has_text="Shaan Fitness")
    expect(row).to_contain_text(collected)   # same month's collection as Billing Analysis
    shot(page, "branches")

    # Phone: a report reads top to bottom -----------------------------------------------------------
    page.set_viewport_size({"width": 390, "height": 844})
    open_page(page, "traffic", "Traffic Analysis")
    shot(page, "traffic-phone")
    page.set_viewport_size({"width": 1440, "height": 900})

    # Front desk executive (Asha): YDL's desk pages only -------------------------------------------------
    ctx.close()
    page = browser.new_context(viewport={"width": 1440, "height": 900}).new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    login(page, "desk@example.com")
    open_page(page, "traffic", "Traffic Analysis")
    open_page(page, "daily-collection", "Daily Collection Analysis")
    nav = page.get_by_role("navigation").first
    expect(nav.get_by_role("link", name="Collection Analysis", exact=True)).to_have_count(0)
    page.goto(BASE + "/analysis/profit-loss")
    page.wait_for_url("**/dashboard")
    shot(page, "desk")
    browser.close()

print("\n".join(errors) if errors else "no console errors")
if errors:
    sys.exit(1)
print("e2e passed")
