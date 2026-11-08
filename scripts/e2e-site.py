"""Click-through of the one-address structure: the public website (every page, the free trial form), join
(sign-up with email confirmation), sign-in that sends each person to their own place, the member app's welcome
view, forgot password, and the owner's website settings — at phone and desktop sizes.
Runs against the local test stack (fresh stack).
Usage: python3 scripts/e2e-site.py <base-url> <out-dir>"""
import re
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
    for h in ["The Shaan method", "Choose how you train", "2,200 sq ft. Five training zones.", "Absolute Athleticism", "Outside the studio", "A day at Shaan", "Questions people ask"]:
        expect(page.get_by_role("heading", name=h)).to_be_visible()
    # The film's four chapters are all in the page, and its first frame is a plain image.
    expect(page.locator(".sf-film-title")).to_have_count(4)
    expect(page.get_by_role("heading", name="Train with Shaan.")).to_be_visible()
    expect(page.locator(".sf-film-poster img")).to_be_visible()
    expect(page.get_by_role("banner").get_by_role("link", name="Log in")).to_be_visible()
    expect(page.locator('script[type="application/ld+json"]').first).to_be_attached()
    shot(page, "website-desktop")

    # The free trial form: no account needed --------------------------------------------------------------
    page.get_by_role("button", name="Request my free trial").click()
    expect(page.get_by_text("Enter your name.")).to_be_visible()
    page.fill("#sf-l-name", "Kavya Lakshmi")
    page.fill("#sf-l-phone", "12345")
    page.get_by_role("button", name="Request my free trial").click()
    expect(page.get_by_text("Enter a 10-digit mobile number.")).to_be_visible()
    page.fill("#sf-l-phone", "98480 70101")
    page.locator("form.sf-form").get_by_text("Weight loss", exact=True).click()
    page.locator("form.sf-form").get_by_text("Evening", exact=True).click()
    page.fill("#sf-l-msg", "Knee pain sometimes")
    page.get_by_role("button", name="Request my free trial").click()
    expect(page.get_by_text("Thank you, Kavya. We’ll call you soon to fix your trial.")).to_be_visible()
    shot(page, "free-trial-sent", full=False)
    page.goto(BASE + "/contact")
    page.fill("#sf-l-name", "Kavya")
    page.fill("#sf-l-phone", "9848070101")
    page.get_by_role("button", name="Request my free trial").click()
    expect(page.get_by_text("We already have your request")).to_be_visible()

    # Every page answers its own search, with its own title --------------------------------------------------
    pages = {"/personal-training-kakinada": ("Personal training in Kakinada", "Personal Trainer in Kakinada"),
             "/group-training-kakinada": ("Coached group training in Kakinada", "Group Fitness Classes in Kakinada"),
             "/weight-loss-kakinada": ("Weight loss program in Kakinada", "Weight Loss Program in Kakinada"),
             "/gym-timings": ("Gym timings and batches", "Gym Timings in Kakinada"),
             "/coaches": ("Meet your coaches", "Fitness Coaches in Kakinada"),
             "/transformations": ("Real results from real members", "Body Transformations in Kakinada"),
             "/about": ("About Shaan Fitness", "About Shaan Fitness"),
             "/contact": ("Visit Shaan Fitness in Kakinada", "Contact Shaan Fitness")}
    for path, (h1, title) in pages.items():
        page.goto(BASE + path)
        expect(page.get_by_role("heading", level=1)).to_have_text(h1)
        expect(page).to_have_title(re.compile("^" + re.escape(title)))
    page.get_by_role("button", name="Show the map").click()
    expect(page.locator("iframe[title^='Map']")).to_be_attached()
    page.get_by_role("banner").get_by_role("button", name="Training").click()
    page.get_by_role("banner").get_by_role("link", name="Weight loss").click()
    page.wait_for_url("**/weight-loss-kakinada")
    page.get_by_role("banner").get_by_role("link", name="Plans & fees").click()
    page.wait_for_url("**/membership-plans")
    expect(page.get_by_role("heading", name="Every plan and fee")).to_be_visible()
    expect(page.get_by_role("heading", name="Compare the plans")).to_be_visible()
    shot(page, "plans-desktop")
    page.get_by_role("link", name="Join online").first.click()
    page.wait_for_url("**/join?plan=*")
    expect(page.locator("#jfirst")).to_be_visible(timeout=15000)
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
    expect(page.get_by_text("Kavya Lakshmi").first).to_be_visible()
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
    expect(page.locator(".sf-foot address")).to_contain_text("Main Road, Godari Gunta")
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
    page.mouse.wheel(0, 1600)
    page.wait_for_timeout(400)
    expect(page.locator(".sf-dock")).to_have_class(re.compile("is-up"))
    page.get_by_role("button", name="Menu").click()
    expect(page.locator("#sf-menu").get_by_role("link", name="Personal training")).to_be_visible()
    shot(page, "website-phone-menu", full=False)
    page.locator("#sf-menu").get_by_role("link", name="Timings").click()
    page.wait_for_url("**/gym-timings")
    expect(page.get_by_role("heading", level=1)).to_have_text("Gym timings and batches")
    page.get_by_role("button", name="Menu").click()
    page.locator("#sf-menu").get_by_role("link", name="Log in").click()
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
    page.goto(BASE + "/")
    page.get_by_role("button", name="Menu").click()
    page.locator("#sf-menu").get_by_role("button", name="తెలుగు").click()
    page.locator("#sf-menu").get_by_role("button", name="మెనూ మూసివేయండి").click()
    expect(page.get_by_role("heading", name="షాన్ పద్ధతి")).to_be_visible()
    shot(page, "website-telugu", full=False)
    page.goto(BASE + "/membership-plans")
    expect(page.get_by_role("heading", level=1)).to_have_text("మెంబర్‌షిప్ ప్లాన్లు, ఫీజులు")
    page.goto(BASE + "/join")
    expect(page.get_by_role("heading", name="Shaan Fitness లో చేరండి")).to_be_visible()
    shot(page, "join-telugu", full=False)
    browser.close()

print("\n".join(errors) if errors else "no console errors")
print("e2e passed")
