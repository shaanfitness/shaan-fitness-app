"""Click-through of the one-address structure: public website, join (sign-up with email
confirmation), sign-in that sends each person to their own place, the member app's welcome
view, forgot password, and the owner's website settings — at phone and desktop sizes.
Runs against the local test stack (fresh stack).
Usage: python3 scripts/e2e-site.py <base-url> <out-dir>"""
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-site")
OUT.mkdir(parents=True, exist_ok=True)
API = "http://127.0.0.1:54321"
errors: list[str] = []
step = 0
PHONE = {"width": 390, "height": 844}
DESKTOP = {"width": 1440, "height": 900}


def shot(page, name, full=True):
    global step
    step += 1
    page.screenshot(path=str(OUT / f"{step:02d}-{name}.png"), full_page=full)


def watch(page):
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and "ERR_TUNNEL" not in m.text and "Failed to load resource" not in m.text and errors.append(f"console: {m.text}"))
    page.on("response", lambda r: r.status >= 400 and "/auth/v1/token" not in r.url and errors.append(f"{r.status} {r.request.method} {r.url[:140]}"))


def sign_in(page, email):
    page.goto(BASE + "/login")
    page.fill("#email", email)
    page.fill("#password", "local-test")
    page.get_by_role("button", name="Sign in").click()


with sync_playwright() as p:
    browser = p.chromium.launch()

    # Website on a computer ---------------------------------------------------------------------------
    ctx = browser.new_context(viewport=DESKTOP)
    page = ctx.new_page()
    watch(page)
    page.goto(BASE + "/")
    expect(page.get_by_role("heading", level=1)).to_contain_text("Your trusted health partner")
    expect(page.get_by_role("heading", name="Plans & prices")).to_be_visible()
    expect(page.get_by_role("heading", name="Timings")).to_be_visible()
    expect(page.get_by_role("heading", name="Coaches")).to_be_visible()
    expect(page.get_by_role("heading", name="Visit us")).to_be_visible()
    expect(page.get_by_role("banner").get_by_role("link", name="Log in")).to_be_visible()
    shot(page, "website-desktop")
    page.get_by_role("link", name="Choose this plan").first.click()
    page.wait_for_url("**/join?plan=*")
    expect(page.get_by_text("Plan", exact=True)).to_be_visible()
    shot(page, "join-desktop", full=False)
    page.get_by_role("button", name="Create my account").click()
    expect(page.get_by_text("Enter your first name.")).to_be_visible()
    expect(page.get_by_text("Please agree to the privacy notice")).to_be_visible()
    page.fill("#jfirst", "Lakshmi")
    page.fill("#jlast", "Devi")
    page.fill("#jmobile", "98480 12345")
    page.fill("#jemail", "lakshmi.web@example.com")
    page.fill("#jpass", "strongpass1")
    page.select_option("#jgender", "female")
    page.locator("#jconsent").check()
    page.get_by_role("button", name="Create my account").click()
    expect(page.get_by_role("heading", name="Check your email")).to_be_visible()
    shot(page, "join-check-email", full=False)

    # Signing in before confirming is explained; then the link is "clicked" ----------------------------
    page.goto(BASE + "/login")
    page.fill("#email", "lakshmi.web@example.com")
    page.fill("#password", "strongpass1")
    page.get_by_role("button", name="Sign in").click()
    expect(page.get_by_text("Confirm your email first")).to_be_visible()
    shot(page, "login-not-confirmed", full=False)
    page.request.post(API + "/auth/v1/_test/confirm", data={"email": "lakshmi.web@example.com"})
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/app")
    expect(page.get_by_role("heading", name="Welcome, Lakshmi")).to_be_visible()
    page.get_by_role("button", name="Book a trial").click()
    expect(page.get_by_text("fix a time for your trial")).to_be_visible()
    page.get_by_role("button", name="I want this plan").first.click()
    expect(page.get_by_text("We’ll call you to start")).to_be_visible()
    shot(page, "member-app-desktop")
    page.goto(BASE + "/")
    expect(page.get_by_role("banner").get_by_role("link", name="Open my app")).to_be_visible()
    page.goto(BASE + "/dashboard")
    page.wait_for_url("**/app")
    ctx.close()

    # Owner: lands on the dashboard; the new enquiry is waiting; edits the website ---------------------
    ctx = browser.new_context(viewport=DESKTOP)
    page = ctx.new_page()
    watch(page)
    sign_in(page, "shaanfitnessgym@gmail.com")
    page.wait_for_url("**/dashboard")
    page.goto(BASE + "/follow-ups")
    expect(page.get_by_text("Lakshmi Devi").first).to_be_visible(timeout=8000)
    page.goto(BASE + "/settings/website")
    expect(page.get_by_role("heading", name="Website", exact=True)).to_be_visible()
    page.fill("#ws-title", "Strong at every age")
    page.fill("#ws-s1", "Main Road, Godari Gunta")
    page.fill("#ws-pin", "533003")
    page.fill("#ws-ig", "instagram.com/shaanfitness")
    page.get_by_role("button", name="Save", exact=True).click()
    expect(page.get_by_text("Links must start with https://")).to_be_visible()
    page.fill("#ws-ig", "https://instagram.com/shaanfitness")
    page.get_by_role("button", name="Save", exact=True).click()
    expect(page.get_by_text("Website saved")).to_be_visible()
    shot(page, "website-settings")
    page.goto(BASE + "/")
    expect(page.get_by_role("heading", level=1)).to_contain_text("Strong at every age")
    expect(page.get_by_role("banner").get_by_role("link", name="Open dashboard")).to_be_visible()
    expect(page.get_by_text("Main Road, Godari Gunta").first).to_be_visible()
    page.goto(BASE + "/login")
    page.wait_for_url("**/dashboard")
    ctx.close()

    # Front desk can't change the website ---------------------------------------------------------------
    ctx = browser.new_context(viewport=DESKTOP)
    page = ctx.new_page()
    watch(page)
    sign_in(page, "desk@example.com")
    page.wait_for_url("**/dashboard")
    page.goto(BASE + "/settings/website")
    page.wait_for_url("**/dashboard")
    ctx.close()

    # Phone: website, menu, join, member app, forgot password -------------------------------------------
    ctx = browser.new_context(viewport=PHONE, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    watch(page)
    page.goto(BASE + "/")
    expect(page.get_by_role("heading", level=1)).to_be_visible()
    shot(page, "website-phone")
    page.get_by_role("button", name="Menu").click()
    expect(page.locator("#site-menu").get_by_role("link", name="Join now")).to_be_visible()
    shot(page, "website-phone-menu", full=False)
    page.locator("#site-menu").get_by_role("link", name="Log in").click()
    page.wait_for_url("**/login")
    shot(page, "login-phone", full=False)
    page.get_by_role("link", name="Forgot password?").click()
    page.fill("#femail", "lakshmi.web@example.com")
    page.get_by_role("button", name="Send link").click()
    expect(page.get_by_text("a link is on its way")).to_be_visible()
    page.goto(BASE + "/login")
    page.fill("#email", "lakshmi.web@example.com")
    page.fill("#password", "strongpass1")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/app")
    expect(page.get_by_role("navigation", name="App").last.get_by_role("link", name="Profile")).to_be_visible()
    shot(page, "member-app-phone")
    page.get_by_role("navigation", name="App").last.get_by_role("link", name="Profile").click()
    page.wait_for_url("**/app/profile")
    ctx.close()

    # Telugu ------------------------------------------------------------------------------------------
    ctx = browser.new_context(viewport=PHONE, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    watch(page)
    page.goto(BASE + "/join")
    page.get_by_role("button", name="తెలుగు").click()
    expect(page.get_by_role("heading", name="Shaan Fitness లో చేరండి")).to_be_visible()
    shot(page, "join-telugu", full=False)
    browser.close()

print("\n".join(errors) if errors else "no console errors")
print("e2e passed")
