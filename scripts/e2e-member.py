"""Click-through of the member app (part 8a) against the local test stack (fresh stack): booking and cancelling a
class, memberships with the invoice and a freeze request, attendance, live traffic, referring a friend, booking an
appointment with a coach; then the gym's Notifications (approving the freeze closes its notification, mark done)
and the Import Batches / Import Membership pages.
Usage: python3 scripts/e2e-member.py <base-url> <out-dir>"""
import re
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-member")
OUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
step = 0
page = None


def sql(q: str) -> str:
    return subprocess.check_output(["psql", "-h", "127.0.0.1", "-p", "54329", "-U", "postgres", "-d", "postgres", "-Atc", q]).decode().strip()


def shot(name):
    global step
    step += 1
    page.screenshot(path=str(OUT / f"{step:02d}-{name}.png"), full_page=True)


def watch(pg):
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errors.append(f"console: {m.text[:200]}"))
    pg.on("response", lambda r: r.status >= 400 and errors.append(f"{r.status} {r.request.method} {r.url[:160]}"))
    pg.on("dialog", lambda d: d.accept())


def login(email, home):
    page.goto(BASE + "/login")
    page.fill("#email", email)
    page.fill("#password", "local-test")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**" + home)


def toast(text):
    expect(page.locator('div[aria-live="polite"]').filter(has_text=text).first).to_be_visible(timeout=8000)


def dialog():
    return page.locator("dialog[open]")


def row(text):
    return page.locator("tbody tr").filter(has_text=text)


ROHIT = sql("select id from members where email = 'member@example.com'")
COACH = sql("select id from staff where first_name = 'Ravi' and role = 'coach' limit 1")
TOMORROW = sql("select app.today('00000000-0000-4000-8000-000000000001') + 1")


def run(p):
    global page
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    ctx.add_init_script("window.print = () => {}")
    page = ctx.new_page()
    watch(page)
    login("member@example.com", "/app")
    expect(page.get_by_role("region", name="Gym right now")).to_be_visible()

    # Book a class tomorrow, see it in My bookings, cancel it -----------------------------------------------------------------
    page.get_by_role("link", name="Book").last.click()
    page.wait_for_url("**/app/book")
    page.get_by_role("tablist", name="Days").get_by_role("tab").nth(1).click()
    bookable = page.get_by_role("button", name=re.compile(r"^Book "))
    expect(bookable.first).to_be_visible()
    label = bookable.first.get_attribute("aria-label")
    bookable.first.click()
    toast("Booked. See you there!")
    assert sql(f"select count(*) from class_bookings where member_id = '{ROHIT}' and class_date = '{TOMORROW}' and cancelled_at is null and source = 'app'") == "1"
    page.get_by_role("tab", name="My bookings (1)").click()
    expect(page.get_by_text("Booked", exact=True)).to_be_visible()
    shot("my-bookings")
    page.get_by_role("button", name="Cancel booking").click()
    toast("Booking cancelled")
    assert sql(f"select count(*) from class_bookings where member_id = '{ROHIT}' and cancelled_at is not null") == "1", label

    # Memberships: the invoice, and a freeze request ------------------------------------------------------------------------------
    page.goto(BASE + "/app/memberships")
    current = page.locator("li").filter(has_text="Active").first
    expect(current).to_contain_text("1:1 Elite")
    sub = sql(f"select id from subscriptions where member_id = '{ROHIT}' order by start_date desc limit 1")
    current.get_by_role("button", name="Freeze").click()
    dialog().locator("#fz-days").fill("0")
    dialog().get_by_role("button", name="Send request").click()
    expect(dialog().get_by_role("alert")).to_have_text("Choose between 1 and 90 days.")
    dialog().locator("#fz-days").fill("2")
    dialog().locator("#fz-note").fill("Family function")
    dialog().get_by_role("button", name="Send request").click()
    toast("Freeze request sent")
    expect(page.get_by_text("is waiting for the gym")).to_be_visible()
    assert sql(f"select status || ' ' || days from freezes where subscription_id = '{sub}'") == "requested 2"
    shot("memberships")
    page.goto(BASE + f"/print/invoice/{sub}")
    expect(page.get_by_text("1:1 Elite").first).to_be_visible()

    # Attendance, traffic ----------------------------------------------------------------------------------------------------------
    page.goto(BASE + "/app/attendance")
    visits = sql(f"select count(distinct date) from attendance where member_id = '{ROHIT}' and status = 'present' and date_trunc('month', date) = date_trunc('month', app.today('00000000-0000-4000-8000-000000000001'))")
    expect(page.locator(".card").filter(has_text="Visits this month")).to_contain_text(visits)
    page.goto(BASE + "/app/traffic")
    expect(page.get_by_text("in the gym")).to_be_visible()

    # Refer a friend ----------------------------------------------------------------------------------------------------------------
    page.goto(BASE + "/app/refer")
    page.fill("#rf-name", "Kavya Sharma")
    page.fill("#rf-phone", "12345")
    page.get_by_role("button", name="Refer").click()
    expect(page.get_by_role("alert")).to_have_text("Enter a 10-digit mobile number.")
    page.fill("#rf-phone", "98765 12345")
    page.get_by_role("button", name="Refer").click()
    toast("Thanks! We’ll call Kavya.")
    expect(page.locator("li").filter(has_text="Kavya Sharma")).to_contain_text("Invited")
    assert sql(f"select referred_by_member_id = '{ROHIT}' from members where phone = '9876512345'") == "t"
    shot("refer")

    # An appointment with a coach ----------------------------------------------------------------------------------------------------
    page.goto(BASE + "/app/coaches")
    page.locator("li").filter(has_text="Ravi Teja").get_by_role("button", name="Book an appointment").click()
    expect(dialog()).to_contain_text("With Ravi Teja")
    dialog().locator("#ask-purpose").select_option("PT Session")
    dialog().get_by_role("button", name="Send request").click()
    toast("Request sent")
    assert sql(f"select handled_by from appointments where member_id = '{ROHIT}' and status = 'wait_list'") == COACH
    ctx.close()

    # The gym's Notifications ------------------------------------------------------------------------------------------------------------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    watch(page)
    login("shaanfitnessgym@gmail.com", "/dashboard")
    expect(page.get_by_role("link", name=re.compile(r"notifications? to handle"))).to_be_visible()
    page.goto(BASE + "/notifications")
    expect(row("Rohit Sharma asked to freeze")).to_contain_text("Freeze request")
    expect(row("New referral: Kavya Sharma")).to_be_visible()
    expect(row("Rohit Sharma asked for an appointment")).to_be_visible()
    shot("notifications")
    row("Rohit Sharma asked to freeze").get_by_role("link", name="Open").click()
    page.wait_for_url("**/registers/freezes")
    page.get_by_role("button", name="Approve").first.click()
    toast("Approved")
    assert sql(f"select done_at is not null from staff_alerts where kind = 'freeze'") == "t", "approving closes the notification"
    page.goto(BASE + "/notifications")
    expect(row("asked to freeze")).to_have_count(0)
    row("New referral: Kavya Sharma").get_by_role("button", name="Done").click()
    toast("1 marked done")
    page.get_by_role("button", name="Mark all done").click()
    toast("marked done")
    expect(page.get_by_text("Nothing to handle.")).to_be_visible()
    page.get_by_role("tab", name="All").click()
    expect(row("New referral: Kavya Sharma")).to_contain_text("Done")

    # Imports ------------------------------------------------------------------------------------------------------------------------------
    trainer = sql("select full_name from staff where first_name = 'Ravi' and role = 'coach' limit 1")
    service = sql("select name from services where studio_id = '00000000-0000-4000-8000-000000000001' and active order by sort limit 1")
    csv = OUT / "batches.csv"
    csv.write_text("Batch Name,Start Time,End Time,Days,Batch Code,Capacity,Gender,Trainers,Services\n"
                   f"Sunrise Yoga,5:30 AM,6:30 AM,Mon-Sat,IMP-1,15,All,{trainer},{service}\n"
                   "Ladies Zumba,18:00,19:00,\"Mon, Wed, Fri\",IMP-2,20,Female,,\n"
                   "Broken,7:00 PM,6:00 PM,Someday,,abc,All,Nobody,\n")
    page.goto(BASE + "/batches/import")
    page.get_by_label("CSV file").set_input_files(str(csv))
    expect(page.get_by_text("batches.csv: 2 ready, 1 with problems (left out).")).to_be_visible()
    expect(row("Broken")).to_contain_text("End Time must be after Start Time")
    expect(row("Broken")).to_contain_text('Trainer "Nobody" not found')
    page.get_by_role("button", name="Import 2 batches").click()
    toast("2 batches imported")
    assert sql("select string_agg(name || ' ' || start_time || ' ' || array_to_string(days, ''), ',' order by name) from batches where batch_code like 'IMP-%'") == "Ladies Zumba 18:00:00 135,Sunrise Yoga 05:30:00 123456"
    csv2 = OUT / "plans.csv"
    csv2.write_text("Plan Name,Price,Duration,Duration Unit,Type,Plan Code,Services,Discount Price,Sessions\n"
                    f"Imported Group 28,4999,28,Days,Gym,IMP-P1,{service},,24\n")
    page.goto(BASE + "/plans/import")
    page.get_by_label("CSV file").set_input_files(str(csv2))
    page.get_by_role("button", name="Import 1 plans").click()
    toast("1 plans imported")
    assert sql("select tenure_value || ' ' || tenure_unit || ' ' || session_count || ' ' || price from plans where plan_code = 'IMP-P1'") == "28 days 24 4999.00"
    shot("import")
    ctx.close()

    # The front desk can't import plans (owner) but sees the notifications ---------------------------------------------------------------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    watch(page)
    login("desk@example.com", "/dashboard")
    page.goto(BASE + "/plans/import")
    expect(page.get_by_text("Your account doesn’t have access to this page.")).to_be_visible()
    page.goto(BASE + "/notifications")
    expect(page.get_by_role("heading", name="Notifications Listing")).to_be_visible()
    ctx.close()
    browser.close()


with sync_playwright() as pw:
    try:
        run(pw)
    except Exception:
        if page is not None:
            try:
                page.screenshot(path=str(OUT / "failed.png"), full_page=True)
            except Exception:
                pass
        raise

print("\n".join(errors) if errors else "e2e-member: all good")
sys.exit(1 if errors else 0)
