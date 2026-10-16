"""Click-through of Move from YDL (part 9) against the local test stack (fresh stack), with made-up CSVs laid out like
YDL's exports: members (YDL's "Name & Number" column), subscriptions, receipts, follow-ups (a done one is left out),
a freeze (YDL's "Freeze Dates" range) and check-ins; importing a file twice doubles nothing; nothing is sent to members.
Usage: python3 scripts/e2e-migrate.py <base-url> <out-dir>"""
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-migrate")
OUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
step = 0
page = None
STUDIO = "00000000-0000-4000-8000-000000000001"


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


def toast(text):
    expect(page.locator('div[aria-live="polite"]').filter(has_text=text).first).to_be_visible(timeout=15000)


def section(name):
    return page.get_by_role("region", name=name)


def upload(name, filename, text):
    f = OUT / filename
    f.write_text(text, encoding="utf-8")
    section(name).get_by_label(f"{name.split('. ', 1)[1]} CSV file").set_input_files(str(f))


PLAN = sql(f"select name from plans where studio_id = '{STUDIO}' and kind = 'gym' and active order by name limit 1")
DESK = sql(f"select full_name from staff where studio_id = '{STUDIO}' and role = 'front_desk' order by created_at limit 1")
TODAY = sql(f"select app.today('{STUDIO}')")
d = lambda n: sql(f"select to_char('{TODAY}'::date + {n}, 'DD-MM-YYYY')")
MESSAGES = sql("select count(*) from messages")
ALERTS = sql("select count(*) from staff_alerts")


def run(p):
    global page
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    watch(page)
    page.goto(BASE + "/login")
    page.fill("#email", "shaanfitnessgym@gmail.com")
    page.fill("#password", "local-test")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/dashboard")
    page.goto(BASE + "/migrate")
    expect(page.get_by_role("heading", name="Move from YDL")).to_be_visible()
    expect(section("Here now")).to_contain_text("Balance due")

    # Members: YDL's "Name & Number" column; a nameless line is reported --------------------------------------------------------
    members_csv = ("Member Name & Number,Member Code,Gender,Added By,Date of Joining,Biometric Code\n"
                   f"Testa Lakshmi 9000000001,SF9001,Female,{DESK},{d(-40)},501\n"
                   f"Testa Ravi (+91 90000 00002),SF9002,Male,,{d(-20)},\n"
                   ",SF9003,Male,,,\n")
    upload("1. Members", "members.csv", members_csv)
    expect(section("1. Members").get_by_role("status")).to_contain_text("2 ready, 1 with problems")
    expect(section("1. Members")).to_contain_text("Name is empty")
    section("1. Members").get_by_role("button", name="Bring 2 rows over").click()
    toast("Members: 2 added, 0 updated")
    assert sql("select first_name || ' ' || last_name || ' ' || phone || ' ' || gender || ' ' || biometric_code from members where member_code = 'SF9001'") == "Testa Lakshmi 9000000001 female 501"
    assert sql("select phone from members where member_code = 'SF9002'") == "9000000002"
    section("1. Members").get_by_role("button", name="Bring 2 rows over").click()
    toast("Members: 0 added, 2 updated")
    assert sql("select count(*) from members where member_code in ('SF9001', 'SF9002')") == "2"

    # Subscriptions -------------------------------------------------------------------------------------------------------------------
    subs_csv = ("Invoice No.,Invoice Date,Customer Name,Plan Name,Start Date,End Date,Plan Status,Net Sale Amount,GST,Total Sale Amount,Payment Status\n"
                f"SFG/09001/25-26,{d(-10)},Testa Lakshmi,{PLAN},{d(-10)},{d(20)},Active,\"₹2,542.37\",457.63,\"3,000.00\",Pending\n"
                f"SFG/09002/25-26,{d(-5)},Testa Ravi,No Such Plan,{d(-5)},{d(25)},Active,1000,0,1000,Paid\n")
    upload("4. Subscriptions", "subs.csv", subs_csv)
    expect(section("4. Subscriptions").get_by_role("status")).to_contain_text("2 ready")
    section("4. Subscriptions").get_by_role("button", name="Bring 2 rows over").click()
    toast("Subscriptions: 1 added, 0 updated, 1 with problems")
    expect(section("4. Subscriptions")).to_contain_text('Plan "No Such Plan" not found')
    assert sql(f"select total_amount || ' ' || (end_date - '{TODAY}'::date) from subscriptions where invoice_no = 'SFG/09001/25-26'") == "3000.00 20"

    # Receipts ---------------------------------------------------------------------------------------------------------------------------
    rec_csv = ("Invoice No..,Receipt No.,Receipt Date,Customer Id.,Customer Name,Receipt added by,Plan Name,Start Date,End Date,Mode,Total Bill Amount,Receipt Paid Amount,Total Balance Amount\n"
               f"SFG/09001/25-26,SFG-R/09001/25-26,{d(-10)},SF9001,Testa Lakshmi,{DESK},{PLAN},{d(-10)},{d(20)},UPI,3000,1000,2000\n")
    upload("5. Receipts", "receipts.csv", rec_csv)
    section("5. Receipts").get_by_role("button", name="Bring 1 row over").click()
    toast("Receipts: 1 added")
    assert sql("select amount || ' ' || mode from payments where receipt_no = 'SFG-R/09001/25-26'") == "1000.00 UPI"

    # Follow-ups (a done one is left out) ----------------------------------------------------------------------------------------------
    fu_csv = ("Name & Number,Follow Up Type,Follow Up Date & Time,Assigned To,Remarks,Status\n"
              f"Testa Ravi 9000000002,Membership Renewal,{d(2)} 10:30 AM,{DESK},Call after 6,Open\n"
              f"Testa Lakshmi 9000000001,Balance due,{d(-3)} 11:00 AM,{DESK},Paid,Done\n")
    upload("6. Follow-ups", "followups.csv", fu_csv)
    expect(section("6. Follow-ups").get_by_role("status")).to_contain_text("1 ready")
    expect(section("6. Follow-ups").get_by_role("status")).to_contain_text("1 left out (Already handled in YDL)")
    section("6. Follow-ups").get_by_role("button", name="Bring 1 row over").click()
    toast("Follow-ups: 1 added")
    assert sql("select type || ' ' || to_char(due_at at time zone 'Asia/Kolkata', 'HH24:MI') from follow_ups f join members m on m.id = f.member_id where m.member_code = 'SF9002'") == "Membership Renewal 10:30"

    # A freeze with YDL's "Freeze Dates" range -----------------------------------------------------------------------------------------------
    fz_csv = ("Customer Name,Package Name,Freeze Days,Freeze Dates,Freezed By,Notes,Client Rep,Freeze Fees\n"
              f"Testa Lakshmi,{PLAN},5,{d(-4)} to {d(0)},{DESK},Travel,,0\n")
    upload("7. Freezes", "freezes.csv", fz_csv)
    section("7. Freezes").get_by_role("button", name="Bring 1 row over").click()
    toast("Freezes: 1 added")
    assert sql("select frozen_days || ' ' || (end_date - '" + TODAY + "'::date) from subscriptions where invoice_no = 'SFG/09001/25-26'") == "5 20"

    # Check-ins, with a column matched by hand ---------------------------------------------------------------------------------------------------
    att_csv = ("Member,Day,In,Out\n"
               f"Testa Lakshmi 9000000001,{d(-1)},6:05 AM,7:15 AM\n")
    upload("9. Check-ins", "checkins.csv", att_csv)
    sec = section("9. Check-ins")
    expect(sec).to_contain_text("Choose the column for Date below.")
    sec.get_by_label("Name").select_option(label="Member")
    sec.get_by_label("Date").select_option(label="Day")
    sec.get_by_label("Check in").select_option(label="In")
    sec.get_by_label("Check out").select_option(label="Out")
    sec.get_by_role("button", name="Bring 1 row over").click()
    toast("Check-ins: 1 added")
    assert sql("select to_char(check_in at time zone 'Asia/Kolkata', 'HH24:MI') || '-' || to_char(check_out at time zone 'Asia/Kolkata', 'HH24:MI') from attendance a join members m on m.id = a.member_id where m.member_code = 'SF9001'") == "06:05-07:15"
    section("Here now").get_by_role("button", name="Refresh").click()
    shot("migrate")

    # Nothing went out --------------------------------------------------------------------------------------------------------------------
    assert sql("select count(*) from messages") == MESSAGES, "no messages to members"
    assert sql("select count(*) from staff_alerts") == ALERTS, "no staff notifications"
    ctx.close()

    # Only the owner -------------------------------------------------------------------------------------------------------------------------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    watch(page)
    page.goto(BASE + "/login")
    page.fill("#email", "desk@example.com")
    page.fill("#password", "local-test")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/dashboard")
    page.goto(BASE + "/migrate")
    page.wait_for_url("**/dashboard")
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

print("\n".join(errors) if errors else "e2e-migrate: all good")
sys.exit(1 if errors else 0)
