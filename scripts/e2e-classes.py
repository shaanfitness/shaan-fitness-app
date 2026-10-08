"""Click-through of YDL Batches & Classes, appointments and attendance reports against the local
test stack: add a batch, the calendar and Class Details, booking, waiting list, check-in, registers,
programs, Daily Booking Appointment, staff attendance, client traffic and the leaderboard.
Usage: python3 scripts/e2e-classes.py <base-url> <out-dir>   (on a fresh local stack)"""
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-classes")
OUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
step = 0


def shot(page, name):
    global step
    step += 1
    page.screenshot(path=str(OUT / f"{step:02d}-{name}.png"), full_page=True)


def toast(page, text):
    expect(page.get_by_text(text, exact=False).first).to_be_visible(timeout=8000)


def lookup(scope, field_id, code):
    scope.locator(f"#{field_id}").fill(code)
    scope.locator(f"#{field_id}").locator("xpath=..").get_by_role("button", name="Lookup").click()
    expect(scope.get_by_text("Found:", exact=False).first).to_be_visible(timeout=8000)


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

    # Batch List and Add Batch ----------------------------------------------------------------
    page.goto(BASE + "/batches")
    expect(page.get_by_role("heading", name="Batch Listing")).to_be_visible()
    expect(page.get_by_text("7:00 AM Group").first).to_be_visible()
    shot(page, "batch-list")
    page.get_by_role("main").get_by_role("link", name="Add Batch").click()
    page.wait_for_url("**/batches/new")
    page.get_by_role("button", name="Save", exact=True).click()
    expect(page.get_by_role("alert").filter(has_text="Enter the batch name")).to_be_visible()
    page.fill("#bname", "Test Zumba")
    page.fill("#bcap", "2")
    page.fill("#broom", "Studio 2")
    page.fill("#binfo", "High-energy dance cardio.")
    page.get_by_role("group", name="Conducted by *").get_by_role("checkbox").first.check()
    page.get_by_role("group", name="Services *").get_by_label("Group Activity").check()
    page.fill("#bst", "06:00")
    page.fill("#bet", "07:00")
    shot(page, "add-batch")
    page.get_by_role("button", name="Save & Close").click()
    page.wait_for_url("**/batches")
    toast(page, "Batch created")
    expect(page.get_by_text("Test Zumba").first).to_be_visible()

    # Class Bookings: book three into a class of two (third goes on the waiting list), check in ---------
    batch_id = page.evaluate("""async () => {
      const r = [...document.querySelectorAll('tr')].find((t) => t.textContent.includes('Test Zumba'))
      return r ? r.querySelector('a[href*="batch="]').getAttribute('href').split('batch=')[1] : null }""")
    assert batch_id, "batch id"
    page.goto(f"{BASE}/classes/bookings?batch={batch_id}")
    expect(page.get_by_role("heading", name="Mark Customer Attendance")).to_be_visible()
    for code in ["SF0003", "SF0009", "SF0012"]:
        lookup(page, "bk-lookup", code)
        page.get_by_role("button", name="Add Customer").click()
        page.wait_for_timeout(700)
    toast(page, "waiting list")
    expect(page.get_by_text("Waiting List").first).to_be_visible()
    page.get_by_role("checkbox", name="Select Kiran Rao").check()
    page.get_by_role("checkbox", name="Select Arjun Murthy").check()
    page.get_by_role("button", name="Check In").click()
    toast(page, "2 checked in")
    shot(page, "class-bookings")

    # Waiting list: approve -----------------------------------------------------------------
    page.goto(BASE + "/classes/waiting-list")
    expect(page.get_by_role("heading", name="Class Waiting List")).to_be_visible()
    row = page.get_by_role("row").filter(has_text="Swathi Naidu")
    expect(row).to_be_visible()
    shot(page, "waiting-list")
    row.get_by_role("button", name="Approve").click()
    toast(page, "the client is booked")

    # Calendar and Class Details --------------------------------------------------------------
    page.goto(BASE + "/classes/calendar")
    expect(page.get_by_role("heading", name="Classes Calender")).to_be_visible()
    page.wait_for_timeout(1200)
    shot(page, "calendar-month")
    page.get_by_role("group", name="View").get_by_role("button", name="week").click()
    page.wait_for_timeout(800)
    shot(page, "calendar-week")
    page.get_by_role("group", name="View").get_by_role("button", name="day").click()
    page.wait_for_timeout(800)
    page.get_by_role("button").filter(has_text="Test Zumba").first.click()
    dlg = page.get_by_role("dialog")
    expect(dlg.get_by_text("Total Booked")).to_be_visible()
    expect(dlg.get_by_text("Swathi Naidu")).to_be_visible()
    dlg.locator("#cd-title").fill("Zumba Special")
    dlg.get_by_role("button", name="Save Changes for this day").click()
    toast(page, "Class updated")
    page.wait_for_timeout(600)
    expect(page.get_by_text("Zumba Special").first).to_be_visible()
    shot(page, "calendar-day")
    page.get_by_role("group", name="View").get_by_role("button", name="list").click()
    page.wait_for_timeout(800)
    shot(page, "calendar-list")

    # Registers and capacity ------------------------------------------------------------------
    for path, heading in [("/classes/attendance", "Class Attendance Listing"), ("/batches/attendance", "Batch Attendance Listing"),
                          ("/classes/capacity", "Classes Capacity Info"), ("/classes/cancelled", "Cancel Class History"),
                          ("/classes/deleted", "Deleted Class History"), ("/classes/feedback", "Class Feedback Listing")]:
        page.goto(BASE + path)
        expect(page.get_by_role("heading", name=heading)).to_be_visible(timeout=8000)
        page.wait_for_timeout(900)
        shot(page, path.strip("/").replace("/", "-"))
    page.goto(BASE + "/classes/attendance")
    expect(page.get_by_text("Kiran Rao").first).to_be_visible(timeout=8000)
    page.goto(BASE + "/batches/attendance")
    expect(page.get_by_text("Arjun Murthy").first).to_be_visible(timeout=8000)

    # Programs ----------------------------------------------------------------------------------
    page.goto(BASE + "/programs/new")
    page.fill("#pgname", "Morning Yoga Live")
    page.fill("#pglink", "https://meet.example.com/yoga")
    page.get_by_label("All days").check()
    page.fill("#pgst", "06:30")
    page.fill("#pget", "07:15")
    page.select_option("#pgtype", "paid")
    page.get_by_role("group", name="Services *").get_by_label("Group Activity").check()
    shot(page, "add-program")
    page.get_by_role("button", name="Save", exact=True).click()
    page.wait_for_url("**/programs")
    expect(page.get_by_text("Morning Yoga Live").first).to_be_visible()
    shot(page, "program-list")
    page.goto(BASE + "/programs/attendance")
    expect(page.get_by_text("Select Program to see the list")).to_be_visible()

    # Daily Booking Appointment ------------------------------------------------------------------
    page.goto(BASE + "/appointments/daily")
    expect(page.get_by_role("heading", name="Daily Booking Appointment")).to_be_visible()
    page.get_by_role("button", name="Book Appointment").click()
    dlg = page.get_by_role("dialog")
    dlg.locator("#ap-title").fill("Diet consultation")
    dlg.locator("#ap-st").fill("11:00")
    dlg.locator("#ap-et").fill("11:30")
    lookup(dlg, "ap-client", "SF0001")
    dlg.locator("#ap-with").select_option(index=1)
    dlg.locator("#ap-room").fill("2")
    shot(page, "book-appointment")
    dlg.get_by_role("button", name="Save changes").click()
    toast(page, "Appointment booked")
    expect(page.get_by_text("Diet consultation").first).to_be_visible()
    shot(page, "daily-appointments")

    # Attendance reports ---------------------------------------------------------------------------
    page.goto(BASE + "/attendance/staff")
    page.get_by_label("Report").select_option("trainer")
    page.get_by_role("button", name="Mark Staff Attendance").click()
    dlg = page.get_by_role("dialog")
    dlg.get_by_role("button", name="Check In").first.click()
    toast(page, "Checked in")
    page.keyboard.press("Escape")
    expect(page.get_by_text("Total Trainer Attendance :")).to_be_visible()
    page.wait_for_timeout(800)
    shot(page, "staff-attendance")
    page.goto(BASE + "/attendance/clients")
    expect(page.get_by_role("heading", name="Traffic Customer Listing")).to_be_visible()
    page.wait_for_timeout(900)
    shot(page, "client-traffic")
    page.get_by_role("button", name="Traffic Filter").click()
    page.get_by_role("dialog").get_by_label("Customers not visited gym from 2 weeks").check()
    page.get_by_role("dialog").get_by_role("button", name="Apply").click()
    expect(page.get_by_text("Fetched Members(", exact=False)).to_be_visible()
    shot(page, "client-traffic-bounced")
    page.goto(BASE + "/attendance/leaderboard")
    expect(page.get_by_role("heading", name="Client Check-ins Leaderboard")).to_be_visible()
    page.wait_for_timeout(900)
    shot(page, "leaderboard")

    # Phone size
    page.set_viewport_size({"width": 390, "height": 844})
    for path in ["/classes/calendar", f"/classes/bookings?batch={batch_id}", "/batches"]:
        page.goto(BASE + path)
        page.wait_for_timeout(1200)
        shot(page, "phone-" + path.split("?")[0].strip("/").replace("/", "-"))
    browser.close()

print("\n".join(errors) if errors else "no console errors")
print("e2e passed")
