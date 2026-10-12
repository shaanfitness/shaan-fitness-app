"""Click-through of Notification & WhatsApp against the local test stack (fresh stack): an app
notification to a group, WhatsApp Settings and QR Manager (test message, connection), Messages
History (filter, view, resend), SMS (templates, bulk send, campaigns, recharges, balance), bulk email,
notifications from the Enquiry list, what a front desk executive without the right sees, and the
member's notification bell.
Usage: python3 scripts/e2e-messaging.py <base-url> <out-dir>"""
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-messaging")
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
    expect(page.get_by_text(text, exact=False).first).to_be_visible(timeout=8000)


def dialog():
    return page.locator("dialog[open]")


def run(p):
    global page
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    watch(page)
    login("shaanfitnessgym@gmail.com", "/dashboard")

    # Send Notification to a group ------------------------------------------------------------------------
    women = int(sql("select count(*) from member_overview where kind = 'member' and gender = 'female' and active"))
    page.goto(BASE + "/notifications/send")
    page.select_option("#nt-group", "female")
    expect(page.get_by_text(f"{women} clients will get this")).to_be_visible()
    page.get_by_role("button", name="Send Notification").click()
    expect(page.get_by_role("alert")).to_have_text("Enter the Message Title and Message Body.")
    page.fill("#nt-title", "Ladies batch")
    page.fill("#nt-body", "A new ladies-only batch starts Monday at 6 PM.")
    page.get_by_role("button", name="Send Notification").click()
    toast(f"Notification sent to {women} clients")
    assert sql("select count(*) from notifications where title = 'Ladies batch'") == str(women)
    shot("notification")

    # WhatsApp Settings -------------------------------------------------------------------------------------
    page.goto(BASE + "/whatsapp/settings")
    page.get_by_label("Birthday 04:00 AM").uncheck()
    page.get_by_label("Paid Balance").check()
    page.get_by_label("Hi", exact=True).check()
    page.fill("#wa-before_expiry_days", "5")
    page.get_by_role("button", name="Save WhatsApp Settings").first.click()
    toast("WhatsApp settings saved")
    page.reload()
    expect(page.get_by_label("Birthday 04:00 AM")).not_to_be_checked()
    expect(page.get_by_label("Paid Balance")).to_be_checked()
    expect(page.locator("#wa-before_expiry_days")).to_have_value("5")
    assert sql("select settings->'whatsapp'->>'salutation' from studios limit 1") == "Hi"
    page.fill("#wa-irregular_days", "1")
    page.get_by_role("button", name="Save WhatsApp Settings").first.click()
    toast("Days should be between")
    errors[:] = [e for e in errors if "save_message_settings" not in e]   # that refusal was the point
    shot("whatsapp-settings")

    # QR Manager: test message, connect ------------------------------------------------------------------------
    page.goto(BASE + "/whatsapp/qr")
    expect(page.get_by_role("heading", name="WhatsApp Not Connected")).to_be_visible()
    page.fill("#wa-mobile", "98480 12345")
    page.get_by_role("button", name="Send Test Message").click()
    toast("Test message queued")
    assert sql("select count(*) from messages where source = 'test' and to_address = '919848012345'") == "1"
    page.select_option("#wa-provider", "ultramsg")
    page.fill("#wa-instance", "instance99999")
    page.get_by_role("button", name="Save connection").click()
    toast("WhatsApp connection saved")
    expect(page.get_by_role("heading", name="WhatsApp Connected")).to_be_visible()
    shot("qr-manager")

    # Messages History: filter, view, resend -----------------------------------------------------------------------
    page.goto(BASE + "/whatsapp/history")
    expect(page.get_by_text("Total (7 Days)")).to_be_visible()
    page.get_by_label("Delivery status").select_option("failed")
    rows = page.locator("table tbody tr")
    expect(rows.first).to_contain_text("FAILURE")
    failed = int(sql("select count(*) from messages where channel = 'whatsapp' and status = 'failed' and created_at > now() - interval '7 days'"))
    expect(rows).to_have_count(failed)
    rows.first.get_by_role("button", name="Actions").click()
    page.get_by_role("menuitem", name="View Reason").click()
    expect(dialog()).to_contain_text("Some error occurred while connecting your WhatsApp")
    dialog().get_by_role("button", name="Close", exact=True).last.click()
    page.get_by_role("button", name="Resend All Failed").click()
    toast(f"{failed} messages will be sent again")
    assert sql("select count(*) from messages where channel = 'whatsapp' and status = 'failed'") == "0"
    page.get_by_label("Delivery status").select_option("queued")
    expect(rows.first).to_contain_text("WAITING")
    shot("whatsapp-history")

    # SMS: a template, a bulk send, the campaign, a recharge, the balance -------------------------------------------
    page.goto(BASE + "/sms/settings")
    page.get_by_role("button", name="Add template").click()
    page.fill("#smt-name-1", "Renewal offer")
    page.fill("#smt-id-1", "12")
    page.fill("#smt-text-1", "Dear {cust_first_name}, renew this week and get 10% off. - SHAAN FITNESS")
    page.get_by_role("button", name="Save").first.click()
    expect(page.get_by_role("alert")).to_contain_text("DLT template ID")
    page.fill("#smt-id-1", "1107170000000000002")
    page.get_by_role("button", name="Save").first.click()
    toast("SMS settings saved")
    page.goto(BASE + "/sms/bulk")
    page.select_option("#sb-group", "active")
    page.select_option("#sb-tpl", "1107170000000000002")
    expect(page.get_by_text("renew this week and get 10% off")).to_be_visible()
    active = int(sql("select count(*) from member_overview where kind = 'member' and live_status in ('active', 'pending') and active"))
    expect(page.get_by_text(f"{active} of {active} clients have a mobile number.")).to_be_visible()
    page.get_by_role("button", name="Send SMS").click()
    dialog().get_by_role("button", name="Yes, send").click()
    toast(f"{active} SMS queued")
    page.goto(BASE + "/sms/campaigns")
    row = page.locator("table tbody tr").first
    expect(row).to_contain_text("Renewal offer")
    expect(row).to_contain_text("Active")
    page.goto(BASE + "/sms/recharges")
    page.get_by_role("button", name="Add Recharge").click()
    dialog().locator("#rc-credits").fill("1000")
    dialog().locator("#rc-amount").fill("250")
    dialog().get_by_role("button", name="Save").click()
    toast("Recharge added")
    expect(page.locator("table tbody tr")).to_have_count(2)
    page.goto(BASE + "/sms/balance")
    expect(page.locator(".kpi").filter(has_text="Credits bought")).to_contain_text("6,000")
    shot("sms-balance")

    # Bulk email to a selected client ------------------------------------------------------------------------------------
    page.goto(BASE + "/email")
    page.get_by_label("Search").fill("Rohit")
    expect(page.locator("table tbody tr")).to_have_count(1)
    page.locator("table tbody tr").first.locator("input[type=checkbox]").check()
    page.get_by_role("button", name="Send Email to Selected").click()
    expect(dialog().get_by_text("1 of 1 clients have an email address.")).to_be_visible()
    dialog().locator("#em-subject").fill("Your progress, {cust_first_name}")
    dialog().locator("#em-body").fill("Hi {cust_first_name}, great work this month!")
    dialog().get_by_role("button", name="Send Email").click()
    toast("1 emails queued")
    assert sql("select subject || ' | ' || body from messages where channel = 'email'") == "Your progress, Rohit | Hi Rohit, great work this month!"
    shot("email")

    # Notifications from the Enquiry list --------------------------------------------------------------------------------
    page.goto(BASE + "/enquiries")
    page.locator("table tbody tr").first.locator("input[type=checkbox]").check()
    page.get_by_role("button", name="Send notification").click()
    dialog().locator("#ntitle").fill("Trial this week")
    dialog().locator("#nbody").fill("Book your free trial session this week.")
    dialog().get_by_role("button", name="Send Notification").click()
    toast("Notification sent to 1 client")
    ctx.close()

    # A front desk executive without the rights ---------------------------------------------------------------------------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    watch(page)
    login("desk@example.com", "/dashboard")
    page.goto(BASE + "/whatsapp/history")
    expect(page.get_by_text("Your account doesn’t have access to this page.")).to_be_visible()
    page.goto(BASE + "/notifications/send")
    expect(page.get_by_text("Your account doesn’t have access to this page.")).to_be_visible()
    ctx.close()

    # The member: the bell, the notifications -------------------------------------------------------------------------------
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    page = ctx.new_page()
    watch(page)
    login("member@example.com", "/app")
    bell = page.get_by_role("link", name="1 unread notification").first
    expect(bell).to_be_visible()
    bell.click()
    expect(page.get_by_role("heading", name="Notifications")).to_be_visible()
    expect(page.locator("li").filter(has_text="New Zumba batch").get_by_text("New", exact=True)).to_be_visible()
    shot("member-notifications")
    page.wait_for_timeout(2500)
    page.goto(BASE + "/app")
    expect(page.get_by_role("link", name="Notifications", exact=True).first).to_be_visible()
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

print("\n".join(errors) if errors else "e2e-messaging: all good")
sys.exit(1 if errors else 0)
