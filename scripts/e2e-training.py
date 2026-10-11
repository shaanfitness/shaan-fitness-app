"""Click-through of Workouts & Diet against the local test stack (fresh stack): make a workout plan
day by day (add, add another, copy a day, copy the plan, delete), a diet plan with an "every day"
breakfast and a Sunday change, the exercise, food and recipe lists (exclude, verify, import, approve),
a client's Workout tab (assign workout and diet, add a measurement, end the workout), Weight Loss
Analysis, what a coach may change, and the member app's Plan (tick today's exercise, add a weight).
Usage: python3 scripts/e2e-training.py <base-url> <out-dir>"""
import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-training")
OUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
step = 0


def sql(q: str) -> str:
    return subprocess.check_output(["psql", "-h", "127.0.0.1", "-p", "54329", "-U", "postgres", "-d", "postgres", "-Atc", q]).decode().strip()


def shot(page, name):
    global step
    step += 1
    page.screenshot(path=str(OUT / f"{step:02d}-{name}.png"), full_page=True)


def watch(page):
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errors.append(f"console: {m.text[:200]}"))
    page.on("response", lambda r: r.status >= 400 and "/storage/" not in r.url and errors.append(f"{r.status} {r.request.method} {r.url[:160]}"))
    page.on("dialog", lambda d: d.accept())


def login(page, email, home):
    page.goto(BASE + "/login")
    page.fill("#email", email)
    page.fill("#password", "local-test")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**" + home)


def toast(page, text):
    expect(page.get_by_text(text, exact=False).first).to_be_visible(timeout=8000)


def table_row(page, text):
    return page.locator("table tbody tr").filter(has_text=text).first


def dialog(page):
    return page.locator("dialog[open]")


def pick(d, field, text, option):
    """Type into a search box the way a person does and choose from its list."""
    box = d.locator(field)
    box.fill("")
    box.press_sequentially(text, delay=20)
    d.get_by_role("option").filter(has_text=option).first.click()


ROHIT = sql("select id from members where email = 'member@example.com'")
AARAV = sql("select id from members where first_name = 'Aarav' and kind = 'member' limit 1")

def run(p):
    global page
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    page = ctx.new_page()
    watch(page)
    login(page, "shaanfitnessgym@gmail.com", "/dashboard")

    # A workout plan: Step 1, Step 2 (add, add another, copy a day) ------------------------------------
    page.goto(BASE + "/workouts")
    expect(page.get_by_role("heading", name="Workout plans Listing")).to_be_visible()
    page.get_by_role("link", name="Create Workout Plan").click()
    page.get_by_role("button", name="Save & Next").click()
    expect(page.get_by_role("alert")).to_have_text("Workout Plan Name is required.")
    page.fill("#wp-name", "E2E Two Day Plan")
    page.get_by_label("Muscle Gain").check()
    page.get_by_label("Beginner").check()
    page.select_option("#wp-days", "2")
    page.get_by_role("button", name="Save & Next").click()
    page.wait_for_url("**/exercises")
    toast(page, "Workout plan created")
    day1 = page.locator("section").filter(has=page.get_by_role("heading", name="Day 1"))
    day1.get_by_role("button", name="Add").click()
    d = dialog(page)
    pick(d, "#ex-name", "Goblet", "Goblet Squat")
    d.locator("#ex-reps").fill("12")
    d.get_by_role("button", name="Save & add another").click()
    toast(page, "Exercise added")
    expect(d.locator("#ex-seq")).to_have_value("2")
    d.locator("#ex-type").select_option("Core")
    d.locator("#ex-part").select_option("")
    pick(d, "#ex-name", "Plank", "Plank")
    d.locator("#ex-reps").fill("")
    d.locator("#ex-time").fill("30")
    d.get_by_role("button", name="Add Exercise").click()
    expect(dialog(page)).to_have_count(0)
    expect(day1.locator("tbody tr")).to_have_count(2)
    expect(day1.get_by_text("30 secs")).to_be_visible()
    day2 = page.locator("section").filter(has=page.get_by_role("heading", name="Day 2"))
    day2.get_by_role("button", name="Copy from").click()
    dialog(page).get_by_role("button", name="Copy").click()
    toast(page, "2 exercises copied")
    expect(day2.locator("tbody tr")).to_have_count(2)
    shot(page, "workout-days")
    # Making it 1 day a week is refused while Day 2 has exercises.
    page.get_by_role("link", name="Basic Information").click()
    expect(page.locator("#wp-name")).to_have_value("E2E Two Day Plan")
    page.select_option("#wp-days", "1")
    page.get_by_role("button", name="Save", exact=True).click()
    expect(page.get_by_role("alert")).to_contain_text("Day 2 has exercises")

    # Listing: make a copy, then delete it ---------------------------------------------------------------
    page.goto(BASE + "/workouts")
    table_row(page, "E2E Two Day Plan").get_by_role("button", name="Actions").click()
    page.get_by_role("menuitem", name="Make a copy").click()
    toast(page, "Workout plan copied")
    page.wait_for_url("**/edit")
    expect(page.locator("#wp-name")).to_have_value("E2E Two Day Plan (copy)")
    page.goto(BASE + "/workouts")
    table_row(page, "E2E Two Day Plan (copy)").locator("input[type=checkbox]").check()
    page.get_by_role("button", name="Delete").click()
    expect(dialog(page)).to_contain_text("ARE YOU SURE YOU WANT TO DELETE THIS WORKOUT PLAN ?")
    dialog(page).get_by_role("button", name="Yes").click()
    toast(page, "1 workout plan deleted")
    expect(page.locator("table").get_by_text("E2E Two Day Plan (copy)")).to_have_count(0)
    shot(page, "workout-list")

    # A diet plan: every-day breakfast, a different Sunday breakfast ------------------------------------------
    page.goto(BASE + "/diets/new")
    page.fill("#dp-name", "E2E Diet")
    page.get_by_label("Fat Loss").check()
    page.fill("#dp-kcal", "1600")
    page.get_by_role("button", name="Save & Next").click()
    page.wait_for_url("**/meals")
    page.get_by_role("button", name="Add Meal").click()
    d = dialog(page)
    d.locator("#mi-meal").select_option("Breakfast")
    d.locator("#mi-time").fill("08:00")
    pick(d, "#mi-item", "Idli", "Idli")
    d.locator("#mi-qty").fill("3")
    kcal = float(d.locator("#mi-kcal").input_value())
    assert kcal > 100, kcal
    d.get_by_role("button", name="Add Item").click()
    toast(page, "Item added")
    expect(page.get_by_role("heading", name="Breakfast · 8:00 AM")).to_be_visible()
    page.get_by_role("tab", name="Sun").click()
    expect(page.get_by_text("Every day", exact=True).first).to_be_visible()
    page.get_by_role("button", name="Change for Sunday").click()
    d = dialog(page)
    pick(d, "#mi-item", "Plain dosa", "Plain dosa")
    d.get_by_role("button", name="Add Item").click()
    toast(page, "Item added")
    expect(page.locator("table").get_by_text("Plain dosa")).to_be_visible()
    expect(page.locator("table").get_by_text("Idli")).to_have_count(0)
    shot(page, "diet-sunday")
    page.get_by_role("tab", name="Every day").click()
    expect(page.locator("table").get_by_text("Idli")).to_be_visible()
    expect(page.locator("table").get_by_text("Plain dosa")).to_have_count(0)
    page.goto(BASE + "/diets")
    expect(table_row(page, "E2E Diet")).to_contain_text("1600 kcal a day")

    # Exercise list: our own exercise, and exclude a general one -------------------------------------------
    page.goto(BASE + "/exercises")
    page.get_by_role("button", name="Add Exercise").click()
    d = dialog(page)
    d.locator("#xf-name").fill("Shaan Special Squat")
    d.locator("#xf-type").select_option("Weight Training")
    d.locator("#xf-part").select_option("Quadriceps")
    d.get_by_role("button", name="Save").click()
    toast(page, "Exercise added")
    expect(page.locator("table").first.get_by_text("Shaan Special Squat")).to_be_visible()
    gen = page.locator("table").nth(1)
    gen.locator("tbody tr").filter(has_text="Arnold Press").locator("input[type=checkbox]").check()
    page.get_by_role("button", name="Exclude in App").click()
    dialog(page).get_by_role("button", name="Yes").click()
    toast(page, "Excluded from the app")
    expect(gen.locator("tbody tr").filter(has_text="Arnold Press")).to_contain_text("Excluded")
    shot(page, "exercises")

    # Foods: add one, mark it not verified ----------------------------------------------------------------
    page.goto(BASE + "/diets/foods")
    page.get_by_role("button", name="Add Food").click()
    d = dialog(page)
    d.locator("#ff-name").fill("Pongal")
    d.locator("#ff-q").fill("1")
    d.locator("#ff-u").select_option("katori")
    d.locator("#ff-kcal").fill("250")
    d.get_by_role("button", name="Save").click()
    toast(page, "Food added")
    row = table_row(page, "Pongal")
    expect(row).to_contain_text("Yes")
    row.locator("input[type=checkbox]").check()
    page.get_by_role("button", name="Mark Not Verified").click()
    dialog(page).get_by_role("button", name="Yes").click()
    toast(page, "Foods updated")
    expect(table_row(page, "Pongal")).not_to_contain_text("Yes")

    # Recipes: add, import a CSV, approve the client's recipe ----------------------------------------------------
    page.goto(BASE + "/recipes")
    page.get_by_role("button", name="Add Recipe").click()
    d = dialog(page)
    d.locator("#rf-name").fill("Sprouts Salad")
    d.locator("#rf-kcal").fill("180")
    d.locator("#rf-prep").fill("10")
    d.get_by_role("button", name="Save").click()
    toast(page, "Recipe added")
    page.get_by_role("button", name="Import Recipe").click()
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
        f.write("Item Name,Quantity,Quantity Units,Proteins In gm,Fats In gm,Carbs In gm,Fibers In gm,Calorie,Prep Time,Ingredients,Instructions,Is Veg\n")
        f.write('Oats Upma,1,bowl,8,6,40,6,250,15,"Oats, onion, peas",Roast and cook,Yes\n')
        f.write("Chicken Salad,1,bowl,30,8,6,3,220,15,,,No\n")
        csv_path = f.name
    dialog(page).locator("input[type=file]").set_input_files(csv_path)
    expect(dialog(page).get_by_text("2 recipes ready to import.")).to_be_visible()
    dialog(page).get_by_role("button", name="Import").click()
    toast(page, "2 recipes imported")
    expect(table_row(page, "Oats Upma")).to_contain_text("250")
    expect(table_row(page, "Chicken Salad")).to_contain_text("Non-veg")
    page.goto(BASE + "/recipes/verify")
    page.get_by_label("Show").select_option("no")
    row = table_row(page, "Ragi Idli")
    expect(row).to_contain_text("Client")
    row.locator("input[type=checkbox]").check()
    page.get_by_role("button", name="Approve", exact=True).click()
    dialog(page).get_by_role("button", name="Yes").click()
    toast(page, "1 recipe approved")
    expect(page.locator("table").get_by_text("Ragi Idli")).to_have_count(0)
    shot(page, "recipes-verify")

    # A client's Workout tab: assign workout and diet, a measurement, end the workout ----------------------------
    page.goto(BASE + f"/clients/{AARAV}/workout")
    page.get_by_role("button", name="Add Workout").click()
    d = dialog(page)
    d.locator("#aw-weight").fill("80")
    d.locator("#aw-ft").fill("5")
    d.locator("#aw-in").fill("9")
    expect(d.get_by_text("Ideal Weight for 175.3 cm")).to_be_visible()
    d.get_by_label("Fat Loss").check()
    d.get_by_label("Beginner").check()
    d.locator("#aw-plan").select_option(label="Beginner Full Body 3 Days (3 days a week)")
    d.get_by_label("Tue").check()
    d.get_by_label("Thu").check()
    d.get_by_label("Sat").check()
    d.get_by_role("button", name="Assign Workout").click()
    toast(page, "Workout plan assigned")
    expect(page.get_by_role("link", name="Beginner Full Body 3 Days")).to_be_visible()
    expect(page.get_by_text("Tue · Thu · Sat")).to_be_visible()
    # The weight and height came in as a measurement.
    expect(page.locator("tbody td:visible").filter(has_text="80 kg").first).to_be_visible()
    page.get_by_role("button", name="Add Diet").click()
    dialog(page).locator("#ad-plan").select_option(label="E2E Diet (1600 kcal) · Fat Loss")
    dialog(page).get_by_role("button", name="Assign Diet").click()
    toast(page, "Diet plan assigned")
    expect(page.get_by_role("link", name="E2E Diet")).to_be_visible()
    page.get_by_role("button", name="Add Measurement").click()
    d = dialog(page)
    d.locator("#ms-weight_kg").fill("79")
    d.get_by_role("button", name="Save").click()
    toast(page, "Measurement saved")
    expect(page.locator("tbody td:visible").filter(has_text="79 kg").first).to_be_visible()
    shot(page, "client-workout-tab")
    page.get_by_role("button", name="End Workout").click()
    toast(page, "Workout plan ended")
    expect(page.get_by_text("No workout plan for")).to_be_visible()
    # Rohit trains every day from now, so the member can tick off today's exercise below.
    page.goto(BASE + f"/clients/{ROHIT}/workout")
    page.get_by_role("button", name="Change Workout").click()
    d = dialog(page)
    d.get_by_label("Fat Loss").check()
    d.get_by_label("Beginner").check()
    d.locator("#aw-plan").select_option(label="Beginner Full Body 3 Days (3 days a week)")
    for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
        d.get_by_label(day, exact=True).check()
    d.get_by_role("button", name="Assign Workout").click()
    toast(page, "Workout plan assigned")
    expect(page.get_by_text("Mon · Tue · Wed · Thu · Fri · Sat · Sun")).to_be_visible()

    # Weight Loss Analysis lists Rohit with what he lost ------------------------------------------------------
    page.goto(BASE + "/analysis/weight-loss")
    page.get_by_label("Created Date").select_option("last_90")
    expect(table_row(page, "Rohit")).to_contain_text("kg")
    with page.expect_download() as dl:
        page.get_by_role("button", name="Export to CSV").click()
    assert dl.value.suggested_filename.startswith("weight-loss-"), dl.value.suggested_filename
    shot(page, "weight-loss")

    # Printable copies open --------------------------------------------------------------------------------------
    page.goto(BASE + "/print/workout/00000000-0000-4000-8000-0000000a0001")
    expect(page.get_by_role("heading", name="Beginner Full Body 3 Days")).to_be_visible()
    page.goto(BASE + "/print/diet/00000000-0000-4000-8000-0000000d0001")
    expect(page.get_by_role("heading", name="Sunday")).to_be_visible()
    ctx.close()

    # A coach changes only his own plans ---------------------------------------------------------------------------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    watch(page)
    login(page, "coach@example.com", "/coach")
    page.goto(BASE + "/workouts")
    table_row(page, "Muscle Gain Push Pull Legs").get_by_role("button", name="Actions").click()
    expect(page.get_by_role("menuitem", name="View Exercises")).to_be_visible()
    expect(page.get_by_role("menuitem", name="Edit")).to_have_count(0)
    page.keyboard.press("Escape")
    table_row(page, "Beginner Full Body 3 Days").get_by_role("button", name="Actions").click()
    expect(page.get_by_role("menuitem", name="Edit")).to_be_visible()
    page.goto(BASE + "/workouts/00000000-0000-4000-8000-0000000a0002/exercises")
    expect(page.get_by_text("You can view this plan.")).to_be_visible()
    expect(page.get_by_role("button", name="Add")).to_have_count(0)
    page.goto(BASE + "/recipes/verify")
    expect(page.get_by_text("The owner or front desk approves recipes.")).to_be_visible()
    shot(page, "coach-view-only")
    ctx.close()

    # The member app: tick today's first exercise, see the diet, add a weight ------------------------------------
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    page = ctx.new_page()
    watch(page)
    login(page, "member@example.com", "/app")
    page.goto(BASE + "/app/plan")
    expect(page.get_by_role("heading", name="Beginner Full Body 3 Days")).to_be_visible()
    first = page.locator("li").filter(has=page.locator("input[type=checkbox]")).first
    first.locator("input[type=checkbox]").check()
    expect(page.get_by_text("1 of 5 done today")).to_be_visible()
    shot(page, "member-workout")
    page.get_by_role("tab", name="Diet").click()
    expect(page.get_by_role("heading", name="1800 kcal Fat Loss (Veg)")).to_be_visible()
    expect(page.get_by_text("Target: 1800 kcal a day")).to_be_visible()
    shot(page, "member-diet")
    page.get_by_role("tab", name="Progress").click()
    page.get_by_role("button", name="Add measurement").click()
    dialog(page).locator("#ms-weight_kg").fill("78")
    dialog(page).get_by_role("button", name="Save").click()
    toast(page, "Measurement saved")
    expect(page.locator("tbody td:visible").filter(has_text="78 kg").first).to_be_visible()
    shot(page, "member-progress")
    ctx.close()
    browser.close()



page = None
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

assert sql(f"select count(*) from workout_logs where member_id = '{ROHIT}' and date = (now() at time zone 'Asia/Kolkata')::date") == "1", "the tick reached the database"
print("\n".join(errors) if errors else "e2e-training: all good")
sys.exit(1 if errors else 0)
