"""Click-through of health tracking in the member app (part 8b) against the local test stack (fresh stack): water from
the home card and the Track page, steps, sleep, mood and goals; adding food (from the list and typed in) and ticking
diet plan meals; the diary; the PAR-Q health form; fitness tools; recipes (add my own, log it as eaten); free plans;
My analysis; and App Settings switches that turn parts off.
Usage: python3 scripts/e2e-health.py <base-url> <out-dir>"""
import re
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-health")
OUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
step = 0
page = None
STUDIO = "00000000-0000-4000-8000-000000000001"


def sql(q: str) -> str:
    return subprocess.check_output(["psql", "-h", "127.0.0.1", "-p", "54329", "-U", "postgres", "-d", "postgres", "-Atc", q]).decode().strip()


def wait_sql(q: str, want: str, timeout=8.0):
    end = time.time() + timeout
    got = None
    while time.time() < end:
        got = sql(q)
        if got == want:
            return
        time.sleep(0.25)
    raise AssertionError(f"{q!r}: wanted {want!r}, got {got!r}")


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


def app_setting(key: str, value: str):
    sql(f"update studios set settings = jsonb_set(settings, '{{app,{key}}}', '{value}') where id = '{STUDIO}'")


ROHIT = sql("select id from members where email = 'member@example.com'")
TODAY = sql(f"select app.today('{STUDIO}')")


def run(p):
    global page
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    page = ctx.new_page()
    watch(page)
    login("member@example.com", "/app")

    # Water from the home card, then the Track page -----------------------------------------------------------------------
    today_card = page.get_by_role("region", name="Today")
    expect(today_card).to_be_visible()
    today_card.get_by_role("button", name="Add a glass of water").click()
    wait_sql(f"select water_ml from daily_logs where member_id = '{ROHIT}' and date = '{TODAY}'", "250")
    page.goto(BASE + "/app/track")
    water = page.get_by_role("region", name="Water")
    expect(water).to_contain_text("0.25 L")
    water.get_by_role("button", name="Add a glass of water").click()
    water.get_by_role("button", name="Add a glass of water").click()
    water.get_by_role("button", name="Add a glass of water").click()
    water.get_by_role("button", name="Remove a glass of water").click()
    expect(water).to_contain_text("0.75 L")
    wait_sql(f"select water_ml from daily_logs where member_id = '{ROHIT}' and date = '{TODAY}'", "750")

    steps = page.get_by_role("region", name="Steps")
    steps.get_by_label("Steps walked").fill("lots")
    steps.get_by_role("button", name="Save").click()
    expect(steps.get_by_role("alert")).to_have_text("Enter steps between 0 and 1,00,000.")
    steps.get_by_label("Steps walked").fill("6,500")
    steps.get_by_role("button", name="Save").click()
    toast("Steps saved")
    sleep = page.get_by_role("region", name="Sleep")
    sleep.get_by_label("Hours slept").fill("7.5")
    sleep.get_by_role("button", name="Save").click()
    toast("Sleep saved")
    page.get_by_role("button", name="Good").click()
    expect(page.get_by_role("button", name="Good")).to_have_attribute("aria-pressed", "true")
    wait_sql(f"select water_ml || ' ' || steps || ' ' || sleep_hours || ' ' || mood from daily_logs where member_id = '{ROHIT}' and date = '{TODAY}'", "750 6500 7.50 4")

    page.get_by_role("region", name="My goals").get_by_role("button", name="Change").click()
    dialog().locator("#g-water").fill("200")
    dialog().get_by_role("button", name="Save").click()
    expect(dialog().get_by_role("alert")).to_contain_text("Check the goals")
    dialog().locator("#g-water").fill("2500")
    dialog().get_by_role("button", name="Save").click()
    toast("Goals saved")
    expect(page.get_by_role("region", name="My goals")).to_contain_text("Water 2.5 L")
    assert sql(f"select water_ml from member_goals where member_id = '{ROHIT}'") == "2500"

    # Add food: from the list, and typed in; remove one --------------------------------------------------------------------
    food = page.get_by_role("region", name="Food")
    food.get_by_role("button", name="Add food").click()
    dialog().locator("#fd-meal").select_option("Breakfast")
    dialog().get_by_role("button", name="Add", exact=True).click()
    expect(dialog().get_by_role("alert")).to_have_text("Choose a food, or type one in.")
    dialog().get_by_label("Search foods and recipes").fill("pesar")
    dialog().get_by_role("button", name=re.compile(r"^Pesarattu")).click()
    dialog().get_by_label(re.compile(r"^Amount")).fill("2")
    expect(dialog()).to_contain_text("320 kcal")
    dialog().get_by_role("button", name="Add", exact=True).click()
    toast("Added to Breakfast")
    assert sql(f"select name || ' ' || quantity || ' ' || calories from food_logs where member_id = '{ROHIT}' and date = '{TODAY}' and food_id is not null") == "Pesarattu 2.00 320.00"
    food.get_by_role("button", name="Add food").click()
    dialog().get_by_role("button", name="Can’t find it? Type it in").click()
    dialog().locator("#fd-name").fill("Filter coffee")
    dialog().get_by_role("button", name="Add", exact=True).click()
    expect(dialog().get_by_role("alert")).to_have_text("Enter the calories (and only numbers).")
    dialog().locator("#fd-kcal").fill("60")
    dialog().get_by_role("button", name="Add", exact=True).click()
    toast("Added to")
    expect(food).to_contain_text("380 kcal eaten")
    food.get_by_role("button", name="Remove Filter coffee").click()
    toast("Removed")
    expect(food).to_contain_text("320 kcal eaten")
    shot("track")

    # Diet plan: tick a meal, untick it ------------------------------------------------------------------------------------------
    page.goto(BASE + "/app/plan?tab=diet")
    almonds = page.get_by_role("checkbox", name="I ate this: Almonds")
    almonds.check()
    expect(page.get_by_text(re.compile(r"Eaten 407 of 1800 kcal today"))).to_be_visible()
    wait_sql(f"select name || ' ' || calories from food_logs where member_id = '{ROHIT}' and date = '{TODAY}' and plan_item_id is not null", "Almonds 86.90")
    expect(page.get_by_text("Pesarattu").first).to_be_visible()
    shot("diet-ticks")
    almonds.uncheck()
    wait_sql(f"select count(*) from food_logs where member_id = '{ROHIT}' and date = '{TODAY}' and plan_item_id is not null", "0")

    # Diary ----------------------------------------------------------------------------------------------------------------------
    page.goto(BASE + "/app/diary")
    expect(page.get_by_text("Good session.")).to_be_visible()
    page.get_by_label("How did today go?").fill("Ran 2 km before the session.")
    page.get_by_label("Video link (optional)").fill("http://example.com/v")
    page.get_by_role("button", name="Save").click()
    expect(page.get_by_role("alert")).to_have_text("The video link must start with https://")
    page.get_by_label("Video link (optional)").fill("https://youtu.be/abc")
    page.get_by_role("button", name="Save").click()
    toast("Saved to your diary")
    entry = page.locator("li").filter(has_text="Ran 2 km")
    expect(entry.get_by_role("link", name="Watch video")).to_have_attribute("href", "https://youtu.be/abc")
    entry.get_by_role("button", name="Delete entry").click()
    toast("Entry deleted")
    expect(page.locator("li").filter(has_text="Ran 2 km")).to_have_count(0)

    # PAR-Q -----------------------------------------------------------------------------------------------------------------------
    page.goto(BASE + "/app/health-form")
    expect(page.get_by_role("group", name=re.compile("pregnant"))).to_have_count(0)
    page.get_by_role("button", name="Save my answers").click()
    expect(page.get_by_role("alert")).to_have_text("Answer every question.")
    for g in page.get_by_role("group").all():
        g.get_by_label("No").check()
    page.get_by_role("group", name=re.compile("asthma")).get_by_label("Yes").check()
    page.get_by_role("group", name=re.compile("free of any other")).get_by_label("Yes").check()
    expect(page.get_by_text("You answered yes to a health question.")).to_be_visible()
    page.get_by_label("Anything else your coach should know?").fill("Inhaler before cardio")
    page.get_by_role("button", name="Save my answers").click()
    toast("Your coach will see this.")
    assert sql(f"select (answers->>'asthma') || ' ' || (answers->>'pregnant') || ' ' || (answers->>'heart_problem') || ' ' || note || ' ' || (filled_by_member_at is not null) from member_medical where member_id = '{ROHIT}'") == "true false false Inhaler before cardio true"
    expect(page.get_by_text(re.compile(r"Last updated .* by you\."))).to_be_visible()

    # Fitness tools --------------------------------------------------------------------------------------------------------------------
    page.goto(BASE + "/app/tools")
    expect(page.get_by_label("Height (cm)")).to_have_value("172")
    bmi = page.get_by_role("region", name="BMI")
    expect(bmi).to_contain_text("26.5")
    expect(bmi).to_contain_text("Overweight")
    page.get_by_label("Weight (kg)").fill("70")
    expect(bmi).to_contain_text("23.7")
    expect(bmi).to_contain_text("Healthy")
    page.get_by_label("Neck (inches)").fill("15")
    expect(page.get_by_role("region", name="Body fat (US Navy method)")).to_contain_text("%")
    shot("tools")

    # Recipes: add my own, eat it, delete it ------------------------------------------------------------------------------------------
    page.goto(BASE + "/app/recipes")
    page.get_by_role("button", name="Add my recipe").click()
    dialog().get_by_role("button", name="Send to the gym").click()
    expect(dialog().get_by_role("alert")).to_have_text("Enter the recipe name.")
    dialog().get_by_label("Recipe name").fill("Ragi Java")
    dialog().get_by_label("Makes").fill("1")
    dialog().get_by_label("Unit").fill("glass")
    dialog().get_by_label("Calories (kcal)").fill("150")
    dialog().get_by_label("Protein (g)").fill("4")
    dialog().get_by_role("button", name="Send to the gym").click()
    toast("The gym checks it")
    card = page.get_by_role("link", name=re.compile("Ragi Java"))
    expect(card).to_contain_text("Waiting for the gym")
    assert sql(f"select studio_id || ' ' || is_verified from recipes where name = 'Ragi Java'") == f"{STUDIO} false"
    page.get_by_label("Veg only").check()
    expect(page.get_by_role("link", name=re.compile("Egg White Omelette"))).to_have_count(0)
    card.click()
    page.wait_for_url("**/app/recipes/*")
    page.get_by_role("button", name="I ate this today").click()
    dialog().locator("#fd-meal").select_option("Evening Snack")
    dialog().get_by_role("button", name="Add", exact=True).click()
    toast("Added to Evening Snack")
    assert sql(f"select name || ' ' || calories from food_logs where member_id = '{ROHIT}' and date = '{TODAY}' and recipe_id is not null and plan_item_id is null") == "Ragi Java 150.00"
    page.get_by_role("button", name="Delete").click()
    toast("Recipe deleted")
    page.wait_for_url("**/app/recipes")
    expect(page.get_by_role("link", name=re.compile("Ragi Java"))).to_have_count(0)

    # Free plans: the coach's plan stays; with no plan, Rohit starts the free diet ----------------------------------------------------------
    page.goto(BASE + "/app/free-plans?tab=diet")
    expect(page.get_by_text("Your coach has given you a plan")).to_be_visible()
    page.locator("li").filter(has_text="1500 kcal South Indian Veg").get_by_role("button", name="View").click()
    expect(dialog()).to_contain_text("Moong Dal Chilla")
    expect(dialog().get_by_role("button", name="Start this plan")).to_have_count(0)
    sql(f"update member_diets set active = false, end_date = '{TODAY}' where member_id = '{ROHIT}'")
    page.goto(BASE + "/app/free-plans?tab=diet")
    page.locator("li").filter(has_text="1500 kcal South Indian Veg").get_by_role("button", name="View").click()
    dialog().get_by_role("button", name="Start this plan").click()
    toast("Started")
    page.wait_for_url("**/app/plan?tab=diet")
    expect(page.get_by_role("heading", name="1500 kcal South Indian Veg (Free)")).to_be_visible()
    assert sql(f"select (assigned_by is null) || ' ' || start_date from member_diets where member_id = '{ROHIT}' and active") == f"true {TODAY}"

    # My analysis -------------------------------------------------------------------------------------------------------------------------
    page.goto(BASE + "/app/analysis")
    expect(page.get_by_role("heading", name="Days trained each week")).to_be_visible()
    expect(page.get_by_role("list", name="By body part")).to_be_visible()
    expect(page.get_by_text("Calories eaten, last 14 days · target 1500 kcal")).to_be_visible()
    expect(page.get_by_role("heading", name="Body", exact=True)).to_be_visible()
    shot("analysis")

    # App Settings turn parts off ------------------------------------------------------------------------------------------------------------
    app_setting("can_add_food", "false")
    app_setting("show_diary", "false")
    app_setting("allow_recipes", "false")
    page.goto(BASE + "/app/track")
    expect(page.get_by_role("region", name="Food").get_by_role("button", name="Add food")).to_have_count(0)
    expect(page.get_by_text("adding other food is off")).to_be_visible()
    page.goto(BASE + "/app/diary")
    expect(page.get_by_text("The diary is turned off.")).to_be_visible()
    page.goto(BASE + "/app/profile")
    expect(page.get_by_role("link", name="My diary")).to_have_count(0)
    expect(page.get_by_role("link", name="Recipes")).to_have_count(0)
    expect(page.get_by_role("link", name="Health form")).to_be_visible()
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

print("\n".join(errors) if errors else "e2e-health: all good")
sys.exit(1 if errors else 0)
