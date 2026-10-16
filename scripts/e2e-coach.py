"""Click-through of the coach app (part 8c) against the local test stack (fresh stack): the coach checks in, marks
class attendance from the roster, records a PT session, marks an appointment attended, asks for leave and cancels
another, checks out, and reads a client's Tracking tab.
Usage: python3 scripts/e2e-coach.py <base-url> <out-dir>"""
import re
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-coach")
OUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
step = 0
page = None
STUDIO = "00000000-0000-4000-8000-000000000001"
RAVI = "00000000-0000-4000-8000-0000000000d2"


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


TODAY = sql(f"select app.today('{STUDIO}')")
# Ravi's classes run every day for this test (the demo batches skip Sundays).
sql(f"update batches set days = '{{1,2,3,4,5,6,7}}' where trainer_ids @> array['{RAVI}']::uuid[]")
EARLY = sql(f"select name from batches where trainer_ids @> array['{RAVI}']::uuid[] order by start_time limit 1")
EARLY_ID = sql(f"select id from batches where trainer_ids @> array['{RAVI}']::uuid[] order by start_time limit 1")
sql(f"delete from attendance where batch_id = '{EARLY_ID}' and date = '{TODAY}'")
EXPECTED = int(sql(
    f"select count(*) from (select member_id from batch_members where batch_id = '{EARLY_ID}' union select member_id from class_bookings where batch_id = '{EARLY_ID}' and class_date = '{TODAY}' and cancelled_at is null and deleted_at is null and status = 'booked') x"))
ROHIT = sql("select id from members where email = 'member@example.com'")


def run(p):
    global page
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    page = ctx.new_page()
    watch(page)
    login("coach@example.com", "/coach")

    # My own check-in ------------------------------------------------------------------------------------------------------
    shift = page.get_by_role("region", name="My attendance")
    expect(shift).to_contain_text("You’re not checked in")
    shift.get_by_role("button", name="Check in").click()
    toast("Checked in")
    expect(shift).to_contain_text("You’re checked in")
    assert sql(f"select count(*) from staff_attendance where staff_id = '{RAVI}' and date = '{TODAY}' and check_out is null and source = 'app'") == "1"

    # Class attendance from the roster -----------------------------------------------------------------------------------------
    card = page.locator(".card").filter(has_text=EARLY).filter(has=page.get_by_role("button", name="Attendance"))
    expect(card).to_contain_text(f"0 of {EXPECTED} in")
    card.get_by_role("button", name="Attendance").click()
    roster = dialog().get_by_role("list", name="Class roster")
    expect(roster.get_by_role("listitem")).to_have_count(EXPECTED)
    boxes = roster.get_by_role("checkbox")
    boxes.nth(0).check()
    boxes.nth(1).check()
    dialog().get_by_role("button", name="Check in 2").click()
    toast("2 checked in")
    expect(card).to_contain_text(f"2 of {EXPECTED} in")
    assert sql(f"select count(*) from attendance where batch_id = '{EARLY_ID}' and date = '{TODAY}' and status = 'present' and source = 'class' and marked_by = '{RAVI}'") == "2"
    card.get_by_role("button", name="Attendance").click()
    expect(dialog().get_by_role("list", name="Class roster").get_by_role("checkbox")).to_have_count(EXPECTED - 2)
    dialog().get_by_role("button", name="Tick all").click()
    dialog().get_by_role("button", name=f"Check in {EXPECTED - 2}").click()
    toast(f"{EXPECTED - 2} checked in")
    expect(card).to_contain_text(f"{EXPECTED} of {EXPECTED} in")

    # A PT session -----------------------------------------------------------------------------------------------------------------
    rohit_pt = page.locator(".row").filter(has_text="Rohit Sharma").filter(has=page.get_by_role("button", name="Record session"))
    used = int(sql(f"select sessions_used from subscriptions where member_id = '{ROHIT}' and kind = 'pt' and trainer_id = '{RAVI}'"))
    rohit_pt.get_by_role("button", name="Record session").click()
    expect(dialog()).to_contain_text(f"{used} of 24 used")
    dialog().get_by_label("Came").check()
    dialog().get_by_label("What you did (optional)").fill("Legs and core")
    dialog().get_by_role("button", name="Save session").click()
    toast("Session recorded")
    expect(page.locator(".row").filter(has_text="Rohit Sharma").filter(has_text="Done today").first).to_be_visible()
    assert sql(f"select activity || ' ' || status from attendance where member_id = '{ROHIT}' and source = 'pt' and date = '{TODAY}'") == "Legs and core present"
    assert int(sql(f"select sessions_used from subscriptions where member_id = '{ROHIT}' and kind = 'pt' and trainer_id = '{RAVI}'")) == used + 1

    # Appointment ----------------------------------------------------------------------------------------------------------------------
    page.get_by_role("button", name="Fitness Test: attended").click()
    toast("Marked attended")
    expect(page.locator(".row").filter(has_text="Fitness Test")).to_contain_text("Attended")
    assert sql("select status from appointments where title = 'Fitness Test'") == "attended"
    shot("coach-day")

    # Leave ---------------------------------------------------------------------------------------------------------------------------
    page.get_by_role("button", name="Ask for leave").click()
    dialog().locator("#lv-mode").select_option("morning_half")
    dialog().locator("#lv-to").fill(sql(f"select '{TODAY}'::date + 3"))
    dialog().get_by_role("button", name="Send request").click()
    expect(dialog().get_by_role("alert")).to_have_text("A half day is a single day.")
    dialog().locator("#lv-mode").select_option("full")
    dialog().locator("#lv-reason").fill("Exam")
    dialog().get_by_role("button", name="Send request").click()
    toast("Leave request sent to the owner")
    assert sql(f"select days || ' ' || status from leave_requests where staff_id = '{RAVI}' and reason = 'Exam'") == "3.0 pending"
    wedding = page.locator(".row").filter(has_text="Cousin's wedding")
    expect(wedding).to_contain_text("Waiting")
    wedding.get_by_role("button", name="Cancel").click()
    toast("Leave request cancelled")
    expect(page.locator(".row").filter(has_text="Cousin's wedding")).to_have_count(0)

    # Check out ---------------------------------------------------------------------------------------------------------------------------
    shift.get_by_role("button", name="Check out").click()
    toast("Checked out")
    expect(shift).to_contain_text("Day done")

    # A client's Tracking tab ---------------------------------------------------------------------------------------------------------------
    page.goto(BASE + f"/clients/{ROHIT}/tracking")
    expect(page.get_by_role("table", name="Daily tracking, last 14 days")).to_be_visible()
    yesterday = sql(f"select to_char('{TODAY}'::date - 1, 'Dy FMDD')")
    page.get_by_role("button", name=yesterday).click()
    food = page.get_by_role("region", name=re.compile(r"^Food on"))
    expect(food).to_contain_text("Masala chai")
    expect(food).to_contain_text("kcal")
    shot("tracking")
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

print("\n".join(errors) if errors else "e2e-coach: all good")
sys.exit(1 if errors else 0)
