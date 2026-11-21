"""The studio's biometric device, simulated: speaks the eSSL / ZKTeco push protocol (ADMS, the /iclock/... requests) to the
website's edge worker running locally against the local test stack, the same way the real device talks to
www.shaanfitness.com. Then signs in and checks what the Biometric Manager shows.
Runs both workers: the website's (public/_worker.js) and the plain-HTTP device address (tools/device-worker/worker.js).
Usage (fresh stack, dev server running): python3 scripts/e2e-device.py <base-url> <out-dir>"""
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots-device")
OUT.mkdir(parents=True, exist_ok=True)
API = "http://127.0.0.1:54321"
ANON = (ROOT / ".local-stack" / "anon-key").read_text().strip()
SN = "CUB7235300639"
DEVICE = "Shaan Fitness Gym (Godari Gunta)"
IST = timezone(timedelta(hours=5, minutes=30))
failures: list[str] = []


def check(ok: bool, what: str):
    print(("ok  " if ok else "FAIL ") + what)
    if not ok:
        failures.append(what)


def sql(query: str) -> str:
    out = subprocess.run(["psql", "-h", "127.0.0.1", "-p", "54329", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", query],
                         capture_output=True, text=True, check=True)
    return out.stdout.strip()


def http(port: int, method: str, path: str, body: str | None = None) -> tuple[int, str]:
    req = urllib.request.Request(f"http://127.0.0.1:{port}{path}", method=method, data=body.encode() if body is not None else None,
                                 headers={"Content-Type": "text/plain", "User-Agent": "iClock Proxy/1.09"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def start_worker(port: int, file: str) -> subprocess.Popen:
    proc = subprocess.Popen(["node", "scripts/device-sim/serve-worker.mjs", str(port), API, ANON, file], cwd=ROOT,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for _ in range(50):
        try:
            http(port, "GET", "/iclock/ping")
            return proc
        except OSError:
            time.sleep(0.1)
    raise SystemExit(f"worker on {port} didn't start")


def ist(minutes_ago: int) -> str:
    return (datetime.now(IST) - timedelta(minutes=minutes_ago)).strftime("%Y-%m-%d %H:%M:%S")


studio = sql("select studio_id from public.staff where user_id = (select id from auth.users where email = 'shaanfitnessgym@gmail.com') and role = 'owner' limit 1")
# A member with a running plan, and their device code (the last 10 digits of the mobile number).
member, phone = sql(f"""select m.id, right(regexp_replace(m.phone, '\\D', '', 'g'), 10) from public.members m
  join public.subscription_overview s on s.member_id = m.id and s.state = 'active'
  where m.studio_id = '{studio}' and m.biometric_code is null and coalesce(m.phone, '') <> ''
    and not exists (select 1 from public.attendance a where a.member_id = m.id and a.date = app.today(m.studio_id))
  order by m.created_at limit 1""").split("|")
print("studio", studio, "member", member)

site = start_worker(8787, "public/_worker.js")
plain = start_worker(8788, "tools/device-worker/worker.js")
try:
    for port, label in ((8787, "website"), (8788, "device address")):
        # A device that wasn't added: answered, nothing kept, listed for the owner.
        serial = f"UNKNOWN{port}"
        code, text = http(port, "GET", f"/iclock/cdata?SN={serial}&options=all&pushver=2.4.1&language=69")
        check(code == 200 and text == "OK", f"{label}: a device that isn't added gets OK")
        check(sql(f"select count(*) from public.device_unknown where serial = '{serial}'") == "1", f"{label}: … and is listed for the owner")

    # The studio's device is already added in the Biometric Manager (copied from YDL); it hasn't called in yet.
    check(sql(f"select count(*) from public.biometric_devices where serial = '{SN}' and last_seen_at is null") == "1", "the studio's device is added, not connected yet")

    # Hello ---------------------------------------------------------------------------------------------------
    code, text = http(8787, "GET", f"/iclock/cdata?SN={SN}&options=all&pushver=2.4.1&language=69")
    lines = text.splitlines()
    check(code == 200 and lines[0] == f"GET OPTION FROM: {SN}", "hello: the device gets its settings")
    check("ATTLOGStamp=0" in lines and "OPERLOGStamp=0" in lines, "hello: it is asked for all its punches, people and fingerprints")
    check(sql(f"select push_version from public.biometric_devices where serial = '{SN}'") == "2.4.1", "hello: its push version is kept")

    # People and fingerprints the device holds (sent once after the hello, OPERLOG) -----------------------------
    body = (f"USER PIN={phone}\tName=Test Member\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000\n"
            f"FP PIN={phone}\tFID=1\tSize=12\tValid=1\tTMP=QUJDREVGR0hJSktM\n"
            "USER PIN=55501\tName=Old Card\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000\n")
    code, text = http(8787, "POST", f"/iclock/cdata?SN={SN}&table=OPERLOG&Stamp=120", body)
    check(text == "OK: 3", f"people and a fingerprint uploaded ({text})")
    check(sql(f"select count(*) from public.device_users where pin = '{phone}' and fingers ? '1'") == "1", "the fingerprint is kept")

    # Punches (ATTLOG): today's check-in, the same punch again, an unknown code, one from before the switch ------
    old = (datetime.now(IST) - timedelta(days=5)).strftime("%Y-%m-%d 07:00:00")
    body = f"{phone}\t{ist(30)}\t0\t1\t0\t0\t0\n55501\t{ist(20)}\t0\t1\t0\t0\t0\n{phone}\t{old}\t0\t1\t0\t0\t0\n"
    code, text = http(8787, "POST", f"/iclock/cdata?SN={SN}&table=ATTLOG&Stamp=9001", body)
    check(code == 200 and text == "OK: 3", f"three punches received ({text})")
    check(sql(f"select count(*) from public.attendance where member_id = '{member}' and source = 'biometric' and date = app.today('{studio}')") == "1",
          "the member is checked in today")
    code, text = http(8787, "POST", f"/iclock/cdata?SN={SN}&table=ATTLOG&Stamp=9001", f"{phone}\t{ist(30)}\t0\t1\t0\t0\t0\n")
    check(text == "OK: 0", "the same punch sent again changes nothing")
    check(sql(f"select string_agg(result, ',' order by punched_at) from public.device_punches where pin in ('{phone}', '55501')") == "before_switch,check_in,unknown",
          "results: before the switch, check-in, unknown code")
    check(sql(f"select att_stamp from public.biometric_devices where serial = '{SN}'") == "9001", "the stamp is kept, so the device doesn't send them again")
    # Older eSSL firmware adds .aspx and sends the serial in lower case.
    code, text = http(8787, "POST", f"/iclock/cdata.aspx?SN={SN.lower()}&table=ATTLOG&Stamp=9002", f"55501\t{ist(5)}\t0\t1\t0\t0\t0\n")
    check(text == "OK: 1", "/iclock/cdata.aspx works the same")

    # Commands: Add User from the client's profile goes to the device on its next poll ---------------------------
    sql(f"insert into public.device_commands (studio_id, member_id, command, method) values ('{studio}', '{member}', 'add', 'finger')")
    code, text = http(8787, "GET", f"/iclock/getrequest?SN={SN}")
    check(f":DATA UPDATE USERINFO PIN={phone}\t" in text, "the device is told to add the member")
    cmd_no = text.split(":")[1]
    code, text = http(8787, "POST", f"/iclock/devicecmd?SN={SN}", f"ID={cmd_no}&Return=0&CMD=DATA\n")
    check(text == "OK", "the device reports back")
    check(sql(f"select status from public.device_commands where cmd_no = {cmd_no}") == "done", "the command is done")
    code, text = http(8787, "GET", f"/iclock/getrequest?SN={SN}")
    check(text == "OK", "nothing more to do: OK")
    # Restart Biometric Device, from Biometric Device Operations.
    sql(f"insert into public.device_operations (studio_id, device_id, operation) select '{studio}', id, 'restart' from public.biometric_devices where serial = '{SN}'")
    code, text = http(8788, "GET", f"/iclock/getrequest?SN={SN}")
    check(":REBOOT" in text, "Restart Biometric Device sends REBOOT (through the device address too)")

    # The database is only reachable through these functions: the public key can't read device tables.
    req = urllib.request.Request(f"{API}/rest/v1/device_punches?select=pin", headers={"apikey": ANON, "Authorization": f"Bearer {ANON}"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = r.read().decode()
            check(body.strip() == "[]", f"the public key reads no punches ({body[:60]})")
    except urllib.error.HTTPError as e:
        check(e.code in (401, 403), f"the public key can't read punches ({e.code})")
    code, text = http(8787, "GET", "/iclock/anything-else")
    check(text == "OK", "other device requests get OK")
finally:
    site.terminate()
    plain.terminate()

# What the desk sees ----------------------------------------------------------------------------------------------
errors: list[str] = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for name, viewport in (("desktop", {"width": 1440, "height": 900}), ("phone", {"width": 390, "height": 844})):
        ctx = browser.new_context(viewport=viewport)
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("response", lambda r: r.status >= 400 and "/auth/v1/token" not in r.url and errors.append(f"{r.status} {r.url[:140]}"))
        page.goto(BASE + "/login")
        page.fill("#email", "shaanfitnessgym@gmail.com")
        page.fill("#password", "local-test")
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_url("**/dashboard")
        page.goto(BASE + "/centers/biometric")
        expect(page.locator('.chip:text-is("Online"):visible').first).to_be_visible(timeout=10000)
        expect(page.locator(f'text={SN} >> visible=true').first).to_be_visible()
        expect(page.locator('.chip:text-is("Checked in"):visible').first).to_be_visible()
        expect(page.locator('.chip:text-is("Code not found"):visible').first).to_be_visible()
        expect(page.locator('text=UNKNOWN8787 >> visible=true').first).to_be_visible()
        page.screenshot(path=str(OUT / f"biometric-{name}.png"), full_page=True)
        if name == "desktop":
            # The client's profile shows the device code; Add User can change it.
            page.goto(BASE + f"/clients/{member}")
            expect(page.locator(f'text={phone} >> visible=true').first).to_be_visible(timeout=10000)
            page.get_by_role("button", name="Add User", exact=True).click()
            page.fill("#bcode", "55501")
            page.locator("#bdev").select_option(label=f"{SN} : {DEVICE}")
            page.get_by_role("button", name="Send to Device").click()
            expect(page.get_by_text("Sent to the device").first).to_be_visible(timeout=8000)
            check(sql(f"select biometric_code from public.members where id = '{member}'") == "55501", "Add User with a new code saves it on the client")
            check(sql(f"select biometric_code from public.device_commands where member_id = '{member}' order by created_at desc limit 1") == "55501",
                  "… and sends that code to the device")
            page.screenshot(path=str(OUT / "profile-code.png"), full_page=True)
        ctx.close()
    browser.close()

check(not errors, "no page errors" + ("" if not errors else ": " + "; ".join(errors[:5])))
print("\n".join(failures) if failures else "device e2e: ok")
sys.exit(1 if failures else 0)
