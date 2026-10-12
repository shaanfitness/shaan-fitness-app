"""Click-through of Community and Challenges against the local test stack (fresh stack): post moderation
(accept, bulk decline), a gym post with a photo, a new challenge with tasks, adding a participant, a team and
its members, recording a task, copying and deleting a challenge, a client's challenges, what a front desk
executive without the community right sees, and the member app: the feed, claps, a post waiting for approval,
joining a challenge, logging today's task and the leaderboard.
Usage: python3 scripts/e2e-community.py <base-url> <out-dir>"""
import base64
import re
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-community")
OUT.mkdir(parents=True, exist_ok=True)
IMG = OUT / "progress.png"
IMG.write_bytes(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8Dwn4GBgYGJAQoAADwAA/2l3Q8AAAAASUVORK5CYII="))
errors: list[str] = []
step = 0
page = None
FAT = "00000000-0000-4000-8000-0000000e0001"
DIWALI = "00000000-0000-4000-8000-0000000e0002"


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


def card(text):
    return page.locator("article").filter(has_text=text)


def row(text):
    return page.locator("tbody tr").filter(has_text=text)


def menu(r, item):
    r.get_by_role("button", name="Actions").click()
    page.get_by_role("menuitem", name=item, exact=True).click()


def yes():
    dialog().get_by_role("button", name="Yes", exact=True).click()


ROHIT = sql("select id from members where email = 'member@example.com'")
ROHIT_CODE = sql(f"select member_code from members where id = '{ROHIT}'")


def run(p):
    global page
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    watch(page)
    login("shaanfitnessgym@gmail.com", "/dashboard")

    # Moderation: accept the pending post, decline one in bulk ---------------------------------------------------------
    page.goto(BASE + "/community")
    pending = card("Finally did 10 pull-ups")
    expect(pending.get_by_text("Pending", exact=True)).to_be_visible()
    pending.get_by_role("button", name="Accept").click()
    expect(dialog()).to_contain_text("ARE YOU SURE YOU WANT TO ACTIVATE THIS POST ?")
    yes()
    toast("1 post accepted")
    expect(page.get_by_text("No Pending Post To Show.")).to_be_visible()
    assert sql("select status from community_posts where body like 'Finally%'") == "active"
    page.get_by_role("tab", name="Active Post").click()
    expect(card("Finally did 10 pull-ups")).to_be_visible()
    card("Down 3.6 kg").get_by_label("Select").check()
    page.get_by_role("button", name="Decline", exact=True).first.click()
    yes()
    toast("1 post declined")
    page.get_by_role("tab", name="Decline post").click()
    expect(card("Down 3.6 kg").get_by_text("Declined", exact=True)).to_be_visible()
    page.get_by_role("tab", name="All Post").click()
    page.get_by_label("Search by user name").fill("arjun")
    expect(page.locator("article")).to_have_count(1)
    page.get_by_label("Search by user name").fill("")

    # A gym post with a photo ------------------------------------------------------------------------------------------
    page.get_by_role("button", name="Upload Post").click()
    dialog().get_by_role("button", name="Submit").click()
    expect(dialog().get_by_role("alert")).to_have_text("Add a photo or write something.")
    dialog().locator("#up-file").set_input_files(str(IMG))
    dialog().locator("#up-body").fill("New squat racks are in. Come try them!")
    dialog().get_by_role("button", name="Submit").click()
    toast("Post published")
    assert sql("select status || ' ' || (media_path is not null) from community_posts where body like 'New squat racks%'") == "active true"
    page.get_by_role("tab", name="Active Post").click()
    img = card("New squat racks").locator("img")
    expect(img).to_be_visible()
    page.wait_for_function("(el) => el.complete && el.naturalWidth > 0", arg=img.element_handle(), timeout=8000)
    shot("moderation")

    # Create a challenge with tasks -----------------------------------------------------------------------------------------
    page.goto(BASE + "/challenges/new")
    page.get_by_role("button", name="Save & Next").click()
    expect(page.get_by_role("alert")).to_have_text("Challenge Name is required.")
    page.fill("#ch-name", "Plank Week")
    page.fill("#ch-desc", "Hold a plank every day for a week.")
    start = sql("select (now() at time zone 'Asia/Kolkata')::date")
    page.fill("#ch-end", sql(f"select '{start}'::date - 1"))
    page.get_by_role("button", name="Save & Next").click()
    expect(page.get_by_role("alert")).to_have_text("The end date can’t be before the start date.")
    page.fill("#ch-end", sql(f"select '{start}'::date + 6"))
    page.get_by_role("button", name="Save & Next").click()
    expect(page.get_by_role("alert")).to_have_text("Terms & Conditions are required.")
    page.fill("#ch-terms", "Hold with good form. Coaches may check.")
    page.get_by_label("Yes", exact=True).check()
    page.get_by_role("button", name="Save & Next").click()
    toast("Challenge created")
    page.wait_for_url("**/tasks")
    plank = sql("select id from challenges where name = 'Plank Week'")
    page.get_by_role("button", name="Add Task").click()
    dialog().get_by_role("button", name="Save Task").click()
    expect(dialog().get_by_role("alert")).to_have_text("Enter the task.")
    dialog().locator("#tk-title").fill("1 minute plank")
    dialog().locator("#tk-target").fill("60")
    dialog().locator("#tk-unit").select_option("secs")
    dialog().locator("#tk-points").fill("20")
    dialog().get_by_role("button", name="Save Task").click()
    toast("Task added")
    page.get_by_role("button", name="Add Task").click()
    dialog().locator("#tk-title").fill("Burpees")
    dialog().locator("#tk-target").fill("15")
    dialog().locator("#tk-day").select_option(label="Only Day 2")
    dialog().get_by_role("button", name="Save Task").click()
    toast("Task added")
    expect(row("Burpees")).to_contain_text("Day 2")
    menu(row("1 minute plank"), "Edit")
    dialog().locator("#tk-points").fill("15")
    dialog().get_by_role("button", name="Save Task").click()
    toast("Task saved")
    expect(row("1 minute plank")).to_contain_text("15")
    shot("tasks")
    page.get_by_role("link", name="Done").click()
    page.wait_for_url(f"**/challenges/{plank}")

    # Add a participant, a team, record a task -------------------------------------------------------------------------------
    expect(page.get_by_text("Nobody has joined yet.")).to_be_visible()
    page.fill("#ch-add", ROHIT_CODE)
    page.get_by_role("button", name="Lookup").click()
    expect(page.get_by_text("Found:")).to_contain_text("Rohit Sharma")
    page.get_by_role("button", name="Add", exact=True).click()
    toast("Rohit Sharma added")
    expect(row("Rohit Sharma")).to_be_visible()
    page.get_by_role("tab", name="Teams (0)").click()
    page.get_by_role("link", name="Create Team", exact=True).click()
    expect(page.locator("#tm-ch")).to_have_value(plank)
    page.fill("#tm-name", "Team Iron")
    page.get_by_role("button", name="Save & Next").click()
    toast("Team created")
    page.wait_for_url("**/members")
    page.get_by_label("Rohit Sharma in Team Iron").check()
    expect(page.get_by_text("1 in the team")).to_be_visible()
    assert sql(f"select t.name from challenge_participants p join challenge_teams t on t.id = p.team_id where p.challenge_id = '{plank}' and p.member_id = '{ROHIT}'") == "Team Iron"
    page.goto(BASE + f"/challenges/teams/new?challenge={plank}")
    page.fill("#tm-name", "team iron")
    page.get_by_role("button", name="Save", exact=True).click()
    expect(page.get_by_role("alert")).to_have_text("This challenge already has a team with that name.")
    errors[:] = [e for e in errors if "challenge_teams" not in e]   # that refusal was the point
    page.goto(BASE + f"/challenges/{plank}")
    expect(row("Rohit Sharma").get_by_label("Team for Rohit Sharma")).to_have_value(sql(f"select id from challenge_teams where name = 'Team Iron'"))
    menu(row("Rohit Sharma"), "Record a task")
    dialog().get_by_role("button", name="Save").click()
    expect(dialog().get_by_role("alert")).to_have_text("Choose the task.")
    dialog().locator("#rt-task").select_option(label="1 minute plank (60 seconds · 15 pts · Every day)")
    dialog().locator("#rt-value").fill("60")
    dialog().get_by_role("button", name="Save").click()
    toast("Task recorded")
    expect(row("Rohit Sharma")).to_contain_text("15")
    page.get_by_role("tab", name="Challenge Details").click()
    expect(page.get_by_text("Hold a plank every day for a week.")).to_be_visible()
    page.get_by_role("button", name="Send Notification").click()
    expect(dialog()).to_contain_text("1 participants of Plank Week")
    dialog().get_by_role("button", name="Close", exact=True).last.click()
    shot("challenge")

    # The running challenge: posts, post leader board, team board ---------------------------------------------------------
    page.goto(BASE + f"/challenges/{FAT}")
    expect(row("Arjun Murthy")).to_be_visible()
    page.get_by_role("tab", name="Posts List").click()
    expect(card("Day 4 done")).to_be_visible()
    page.get_by_role("tab", name="Post Leader Board").click()
    expect(row("Meera Chowdary")).to_be_visible()
    page.get_by_role("tab", name="Teams (2)").click()
    agni = sql(f"select sum(e.points) from challenge_entries e join challenge_participants p using (challenge_id, member_id) where p.team_id = '00000000-0000-4000-8000-0000000e0011'")
    expect(row("Team Agni")).to_contain_text(agni)

    # Copy, then delete the copy ---------------------------------------------------------------------------------------------
    page.goto(BASE + f"/challenges/{plank}")
    page.get_by_role("button", name="Copy", exact=True).click()
    page.wait_for_url("**/edit")
    copy = page.url.split("/challenges/")[1].split("/")[0]
    assert copy != plank
    assert sql(f"select name || ' ' || active || ' ' || (select count(*) from challenge_tasks where challenge_id = c.id) from challenges c where id = '{copy}'") == "Plank Week (copy) false 2", sql(f"select name, active from challenges where id = '{copy}'")
    page.goto(BASE + "/challenges")
    copy_row = row("Plank Week (copy)")
    expect(copy_row.get_by_text("Deactivated")).to_be_visible()
    copy_row.locator("input[type=checkbox]").check()
    page.get_by_role("button", name="Delete", exact=True).click()
    expect(dialog()).to_contain_text("ARE YOU SURE YOU WANT TO DELETE THIS Challenge ?")
    yes()
    toast("Challenges deleted")
    expect(row("Plank Week (copy)")).to_have_count(0)

    # A client's challenges (from the profile) -------------------------------------------------------------------------------
    page.goto(BASE + f"/clients/{ROHIT}")
    page.get_by_role("link", name="View Participated Challenges").click()
    expect(page.get_by_text("Challenges Rohit Sharma takes part in.")).to_be_visible()
    expect(row("21 Day Fat Loss Challenge")).to_be_visible()
    expect(row("Plank Week")).to_be_visible()
    expect(row("Diwali Step Challenge")).to_have_count(0)
    shot("client-challenges")
    ctx.close()

    # A front desk executive without the community right ---------------------------------------------------------------------
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    watch(page)
    login("desk@example.com", "/dashboard")
    page.goto(BASE + "/community")
    expect(page.get_by_text("Your account doesn’t have access to this page.")).to_be_visible()
    page.goto(BASE + "/challenges")
    expect(row("21 Day Fat Loss Challenge")).to_be_visible()
    ctx.close()

    # The member app -------------------------------------------------------------------------------------------------------
    ctx = browser.new_context(viewport={"width": 390, "height": 844})
    page = ctx.new_page()
    watch(page)
    login("member@example.com", "/app")
    page.goto(BASE + "/app/community")
    arjun = card("Finally did 10 pull-ups")
    expect(arjun).to_contain_text("Arjun M.")
    expect(arjun).not_to_contain_text("Murthy")
    expect(card("Down 3.6 kg")).to_contain_text("Not approved by the gym")
    arjun.get_by_role("button", name="Clap · 0").click()
    expect(arjun.get_by_role("button", name="Clap · 1")).to_have_attribute("aria-pressed", "true")
    page.wait_for_timeout(500)
    assert sql(f"select count(*) from post_claps c join community_posts p on p.id = c.post_id where p.body like 'Finally%'") == "1"
    page.get_by_role("button", name="New post").click()
    dialog().get_by_role("button", name="Post", exact=True).click()
    expect(dialog().get_by_role("alert")).to_have_text("Add a photo or write something.")
    dialog().locator("#np-body").fill("Leg day done!")
    dialog().get_by_role("button", name="Post", exact=True).click()
    toast("Posted. The gym checks it before others see it.")
    assert sql("select status from community_posts where body = 'Leg day done!'") == "pending"
    expect(card("Leg day done!")).to_contain_text("Waiting for the gym to approve")
    shot("member-feed")
    card("Leg day done!").get_by_role("button", name="Delete").click()
    expect(card("Leg day done!")).to_have_count(0)

    pts = int(sql(f"select coalesce(sum(points), 0) from challenge_entries where challenge_id = '{FAT}' and member_id = '{ROHIT}'"))
    page.goto(BASE + "/app/challenges")
    fat = page.get_by_role("link").filter(has_text="21 Day Fat Loss Challenge")
    expect(fat).to_contain_text(f"Joined · {pts} pts · Team Agni")
    expect(fat).not_to_contain_text("Team Team")
    expect(page.get_by_role("link").filter(has_text="Plank Week")).to_contain_text("Team Iron")
    shot("member-challenges")

    # Join the upcoming one after accepting the terms
    page.get_by_role("link").filter(has_text="Diwali Step Challenge").click()
    join = page.get_by_role("button", name="Join the challenge")
    expect(join).to_be_disabled()
    page.get_by_label("I accept the terms and conditions").check()
    join.click()
    toast("You’re in! Good luck.")
    assert sql(f"select count(*) from challenge_participants where challenge_id = '{DIWALI}' and member_id = '{ROHIT}'") == "1"
    page.get_by_role("tab", name="Today’s tasks").click()
    expect(page.get_by_text("Tasks open when the challenge starts.")).to_be_visible()

    # Log today's task in the running one
    page.goto(BASE + f"/app/challenges/{FAT}")
    expect(page.get_by_text(re.compile(rf"My points: {pts}\b"))).to_be_visible()
    page.get_by_label("50 squats").fill("50")
    page.locator("li").filter(has_text="50 squats").get_by_role("button", name="Save").click()
    toast("Saved")
    expect(page.locator("li").filter(has_text="50 squats").get_by_text("Done · 10")).to_be_visible()
    expect(page.get_by_text(re.compile(rf"My points: {pts + 10}\b"))).to_be_visible()
    shot("member-today")
    page.get_by_role("tab", name="Leaderboard").click()
    expect(page.get_by_text("Rohit S. (you)")).to_be_visible()
    expect(page.get_by_text("Arjun Murthy")).to_have_count(0)
    page.get_by_role("tab", name="Posts").click()
    expect(card("Day 4 done")).to_contain_text("Meera C.")
    shot("member-board")
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

print("\n".join(errors) if errors else "e2e-community: all good")
sys.exit(1 if errors else 0)
