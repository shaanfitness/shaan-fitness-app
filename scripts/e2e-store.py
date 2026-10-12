"""Click-through of the wallet, the store, appointments and help against the local test stack (fresh stack):
wallet categories and activity plans, a client's wallet (add money, an hourly activity, the balance check),
the Wallet Register and Activity Traffic, store categories and products, Place Order from a client's profile,
Client Orders (confirm, payment details, cancel), Schedule Appointments (a member's request, a new booking),
tutorial videos and the FAQ, what the front desk sees, and the member app's wallet, store, orders and
appointments.
Usage: python3 scripts/e2e-store.py <base-url> <out-dir>"""
import re
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-store")
OUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
step = 0
page = None
STORE = "00000000-0000-4000-8000-0000000f0101"
WHEY = "00000000-0000-4000-8000-0000000f0121"
CREATINE = "00000000-0000-4000-8000-0000000f0122"


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


def row(text):
    return page.locator("tbody tr").filter(has_text=text)


def menu(r, item):
    r.get_by_role("button", name="Actions").click()
    page.get_by_role("menuitem", name=item, exact=True).click()


ROHIT = sql("select id from members where email = 'member@example.com'")
SNEHA = sql("select id from members where first_name = 'Sneha' and kind = 'member' limit 1")
DIYA = sql("select id from members where first_name = 'Diya' and kind = 'member' limit 1")
TODAY = sql("select app.today('00000000-0000-4000-8000-000000000001')")
TOMORROW = sql("select app.today('00000000-0000-4000-8000-000000000001') + 1")


def balance(member):
    return sql(f"select coalesce(sum(case when kind = 'credit' then amount else -amount end), 0) from wallet_transactions where member_id = '{member}'")


def run(p):
    global page
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    watch(page)
    login("shaanfitnessgym@gmail.com", "/dashboard")

    # Wallet setup: a category and an hourly activity -----------------------------------------------------------------
    page.goto(BASE + "/wallet/categories/new")
    page.fill("#cf-wallet_categories-name", "Pool")
    page.fill("#cf-wallet_categories-description", "The swimming pool.")
    page.get_by_role("button", name="Save", exact=True).click()
    toast("Category added")
    page.wait_for_url("**/wallet/categories")
    expect(row("Pool")).to_contain_text(re.compile(r"WC\d{4}"))
    page.goto(BASE + "/wallet/activities/new")
    page.fill("#cf-wallet_activities-name", "Swimming")
    page.fill("#cf-wallet_activities-price", "100")
    page.get_by_role("group", name=re.compile("^Is One time")).get_by_label("No").check()
    page.select_option("#cf-wallet_activities-category_id", label="Pool")
    page.get_by_role("button", name="Save", exact=True).click()
    expect(page.get_by_role("alert")).to_have_text("Enter the activity duration in hours (it is charged per block of time).")
    page.fill("#cf-wallet_activities-duration_hours", "1")
    page.get_by_role("button", name="Save", exact=True).click()
    toast("Activity added")
    expect(row("Swimming")).to_contain_text("Per 1 hour")
    swim = sql("select id from wallet_activities where name = 'Swimming'")

    # A client's wallet ----------------------------------------------------------------------------------------------------
    start = int(float(balance(ROHIT)))
    page.goto(BASE + f"/clients/{ROHIT}/wallet")
    expect(page.get_by_role("link", name="Wallet & Orders")).to_be_visible()
    page.get_by_role("button", name="Add Money").click()
    dialog().get_by_role("button", name="Save").click()
    expect(dialog().get_by_role("alert")).to_have_text("Enter the amount.")
    dialog().locator("#wl-amount").fill("500")
    dialog().locator("#wl-method").select_option("UPI")
    expect(dialog()).to_contain_text(f"the balance becomes ₹{start + 500:,}")
    dialog().get_by_role("button", name="Save").click()
    toast(f"Saved. Wallet balance ₹{start + 500:,}")
    page.get_by_role("button", name="Use an Activity").click()
    dialog().locator("#wl-act").select_option(swim)
    dialog().locator("#wl-start").fill(f"{TODAY}T07:00")
    dialog().locator("#wl-end").fill(f"{TODAY}T08:30")
    expect(dialog()).to_contain_text("1 hr 30 min · ₹200 out")
    dialog().get_by_role("button", name="Save").click()
    toast(f"Saved. Wallet balance ₹{start + 300:,}")
    assert sql(f"select amount || ' ' || minutes from wallet_transactions where activity_id = '{swim}'") == "200.00 90"
    page.get_by_role("button", name="Use an Activity").click()
    dialog().locator("#wl-act").select_option(swim)
    dialog().locator("#wl-start").fill(f"{TODAY}T00:00")
    dialog().locator("#wl-end").fill(f"{TODAY}T23:00")
    dialog().get_by_role("button", name="Save").click()
    expect(dialog().get_by_role("alert")).to_contain_text("Not enough in the wallet")
    dialog().get_by_role("button", name="Close", exact=True).last.click()
    shot("client-wallet")

    page.goto(BASE + "/wallet/register")
    expect(row("Rohit Sharma").first).to_be_visible()
    page.get_by_label("Transaction Type").select_option("debit")
    expect(page.locator("tbody tr").filter(has_text="Credit")).to_have_count(0)
    page.goto(BASE + "/wallet/traffic")
    expect(row("Swimming")).to_contain_text("1 hr 30 min")
    shot("activity-traffic")

    # Store: a category and a product from the store page -------------------------------------------------------------------
    page.goto(BASE + f"/store/{STORE}")
    page.get_by_role("link", name="Add category in store from here").click()
    expect(dialog()).to_be_visible()
    dialog().locator("#cf-store_categories-name").fill("Drinks")
    dialog().get_by_role("button", name="Add Category").click()
    toast("Category added")
    page.goto(BASE + f"/store/{STORE}/products?add=1")
    dialog().locator("#cf-products-name").fill("Protein Bar")
    dialog().locator("#cf-products-category_id").select_option(label="Drinks")
    dialog().locator("#cf-products-price").fill("120")
    dialog().locator("#cf-products-stock").fill("10")
    dialog().get_by_role("button", name="Add Product").click()
    toast("Product added")
    expect(row("Protein Bar")).to_contain_text("Drinks")
    assert sql("select studio_id = '00000000-0000-4000-8000-000000000001' and gst_percent = 18 from products where name = 'Protein Bar'") == "t"

    # Place Order from the client's profile ------------------------------------------------------------------------------------
    page.goto(BASE + f"/clients/{ROHIT}")
    page.get_by_role("link", name="Place Order").first.click()
    page.wait_for_url("**/store/orders/new?client=*")
    expect(page.get_by_text("Client: ")).to_contain_text("Rohit Sharma")
    page.get_by_role("button", name="Place Order").click()
    expect(page.get_by_role("alert")).to_have_text("Add at least one product.")
    page.get_by_role("button", name="Add Whey Protein 1 kg").click()
    page.get_by_role("button", name="One more Whey Protein 1 kg").click()
    page.get_by_role("button", name="Add Shaker Bottle").click()
    expect(page.get_by_text("Gym Gloves").locator("..").get_by_role("button", name="Add Gym Gloves")).to_be_disabled()
    page.get_by_role("button", name=re.compile(r"Received in full")).click()
    page.select_option("#or-pay", "upi")
    page.get_by_role("button", name="Place Order").click()
    toast("Order placed")
    page.wait_for_url("**/store/orders?client=*")
    assert sql(f"select total || ' ' || payment_status || ' ' || status from store_orders where member_id = '{ROHIT}'") == "5297.00 paid confirmed"
    assert sql(f"select stock from products where id = '{WHEY}'") == "10"
    shot("orders-client")

    # Client Orders: confirm Sneha's app order, payment details, cancel Rohit's --------------------------------------------------
    page.goto(BASE + "/store/orders")
    sneha_order = row("Sneha Kumar")
    sneha_order.get_by_role("button", name=re.compile(r"ORD\d+")).click()
    expect(dialog()).to_contain_text("Creatine 250 g")
    dialog().get_by_role("button", name="Confirm Order").click()
    expect(page.get_by_text(re.compile(r"^Order ORD\d+ confirmed$"))).to_be_visible(timeout=8000)
    assert sql(f"select count(*) from notifications where member_id = '{SNEHA}' and title like 'Order ORD%'") == "1"
    menu(row("Sneha Kumar"), "Update Payment Details")
    dialog().locator("#op-total").fill("850")
    dialog().locator("#op-recv").fill("850")
    expect(dialog()).to_contain_text("A discount of ₹49")
    dialog().get_by_role("button", name="Save").click()
    toast("Payment details saved")
    expect(row("Sneha Kumar")).to_contain_text("Paid")
    rohit_order = row("Rohit Sharma")
    rohit_order.locator("input[type=checkbox]").check()
    page.get_by_role("button", name="Cancel Orders").click()
    toast("1 order marked cancelled")
    assert sql(f"select stock from products where id = '{WHEY}'") == "12", "cancelling puts the stock back"
    expect(row("Rohit Sharma")).to_contain_text("Refund due")
    row("Rohit Sharma").get_by_role("button", name=re.compile(r"ORD\d+")).click()
    dialog().get_by_role("button", name="Refund to Wallet").click()
    toast("₹5,297 refunded to the wallet")
    assert sql(f"select amount from wallet_transactions where member_id = '{ROHIT}' and source = 'refund'") == "5297.00"
    expect(row("Rohit Sharma")).not_to_contain_text("Refund due")
    shot("orders")

    # Appointments: review a request, book a new one -------------------------------------------------------------------------------
    page.goto(BASE + "/appointments")
    req = page.get_by_role("region", name="Requests from the app")
    expect(req).to_contain_text("Diya Naidu")
    req.get_by_role("button", name="Review").click()
    expect(dialog()).to_contain_text("asked for this from the app")
    dialog().locator("#sa-status").select_option("confirmed")
    dialog().locator("#sa-with").select_option(label="Ravi Teja (Trainer)")
    dialog().get_by_role("button", name="Save changes").click()
    toast("Appointment saved")
    assert sql(f"select count(*) from notifications where member_id = '{DIYA}' and title = 'Appointment confirmed'") == "1"
    expect(page.get_by_role("region", name="Requests from the app")).to_have_count(0)
    page.get_by_role("button", name="Schedule Appointment").click()
    dialog().locator("#sa-purpose").select_option("PT Session")
    dialog().locator("#sa-date").fill(TOMORROW)
    dialog().locator("#sa-start").fill("08:00")
    dialog().locator("#sa-end").fill("07:00")
    dialog().get_by_role("button", name="Save changes").click()
    expect(dialog().get_by_role("alert")).to_have_text("Appointment start time should be less than end time.")
    dialog().locator("#sa-end").fill("09:00")
    dialog().locator("#sa-client").fill(sql(f"select member_code from members where id = '{ROHIT}'"))
    dialog().get_by_role("button", name="Lookup").click()
    expect(dialog().get_by_text("Found:")).to_be_visible()
    dialog().get_by_role("button", name="Save changes").click()
    toast("Appointment scheduled")
    assert sql(f"select title || ' ' || status from appointments where member_id = '{ROHIT}' and purpose = 'PT Session'") == "PT Session open"
    shot("appointments")

    # Help --------------------------------------------------------------------------------------------------------------------------
    page.goto(BASE + "/help/videos")
    page.get_by_role("button", name="Add Video").click()
    dialog().locator("#cf-help_videos-title").fill("Booking a class in the app")
    dialog().locator("#cf-help_videos-url").fill("http://example.com/video")
    dialog().get_by_role("button", name="Add Video").click()
    expect(dialog().get_by_role("alert")).to_have_text("The video link should start with https://")
    dialog().locator("#cf-help_videos-url").fill("https://www.youtube.com/watch?v=abcdefghijk")
    dialog().get_by_role("button", name="Add Video").click()
    toast("Video added")
    expect(page.get_by_role("button", name="Play Booking a class in the app")).to_be_visible()
    page.goto(BASE + "/help/faq")
    page.get_by_role("button", name="What is the wallet?").click()
    expect(page.get_by_role("link", name="Open Wallet Register")).to_be_visible()
    ctx.close()

    # The front desk: orders and the wallet, not the wallet's setup --------------------------------------------------------------------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    watch(page)
    login("desk@example.com", "/dashboard")
    page.goto(BASE + "/wallet/register")
    page.wait_for_url("**/dashboard")
    page.goto(BASE + "/store/orders")
    expect(row("Sneha Kumar")).to_be_visible()
    page.goto(BASE + f"/clients/{ROHIT}/wallet")
    expect(page.get_by_role("button", name="Add Money")).to_be_visible()
    expect(page.get_by_role("button", name="Correct Balance")).to_have_count(0)
    ctx.close()

    # The member app ----------------------------------------------------------------------------------------------------------------
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    page = ctx.new_page()
    watch(page)
    login("member@example.com", "/app")
    page.goto(BASE + "/app/wallet")
    expect(page.get_by_text(f"₹{int(float(balance(ROHIT))):,}").first).to_be_visible()
    expect(page.get_by_role("heading", name="Ways to earn")).to_be_visible()
    expect(page.get_by_text("Swimming").first).to_be_visible()
    shot("member-wallet")

    page.goto(BASE + "/app/store")
    page.get_by_role("button", name="Add Creatine 250 g").click()
    page.get_by_role("button", name=re.compile(r"1 item.*View cart")).click()
    expect(dialog()).to_contain_text("₹899")
    dialog().get_by_role("button", name="Place order").click()
    toast("Order placed")
    page.wait_for_url("**/app/orders")
    assert sql(f"select stock from products where id = '{CREATINE}'") == "2"
    page.locator("li").first.get_by_role("button").first.click()
    expect(page.locator("li").first).to_contain_text("Creatine 250 g × 1")
    page.locator("li").first.get_by_role("button", name="Cancel order").click()
    toast("Order cancelled")
    assert sql(f"select stock from products where id = '{CREATINE}'") == "3"
    shot("member-orders")

    page.goto(BASE + "/app/appointments")
    expect(page.get_by_text("PT Session")).to_be_visible()
    page.get_by_role("button", name="Ask for one").click()
    dialog().get_by_role("button", name="Send request").click()
    expect(dialog().get_by_role("alert")).to_have_text("Choose what the appointment is for.")
    dialog().locator("#ask-purpose").select_option("BMI Check")
    dialog().locator("#ask-time").fill("19:00")
    dialog().get_by_role("button", name="Send request").click()
    toast("Request sent")
    expect(page.get_by_text("Requested").first).to_be_visible()
    assert sql(f"select count(*) from appointments where member_id = '{ROHIT}' and status = 'wait_list'") == "1"
    shot("member-appointments")
    page.goto(BASE + "/app/videos")
    expect(page.get_by_role("heading", name="Booking a class in the app")).to_be_visible()
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

print("\n".join(errors) if errors else "e2e-store: all good")
sys.exit(1 if errors else 0)
