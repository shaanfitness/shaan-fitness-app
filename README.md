# Shaan Fitness app

One app and one website for everyone at Shaan Fitness. After login, each person sees their own space:

| Login | Opens on | Can see |
|---|---|---|
| Owner | Dashboard | Everything, including money, health and the activity log |
| Front desk | Today | Members, slots, payments and follow-ups. Never health details |
| Coach | Their day | Their own members, slots and follow-ups. Never money |
| Doctor | Consults | Their assigned members' health only. Never money |
| Member | Home | Only their own plan, sessions, payments and bookings |

These rules are enforced by the database itself (row-level security), not just hidden on screen.

## What's in this first build (wave 1, part 1)

- Login and a home screen for each role, with English and Telugu for members
- Front desk: Today (who's in now, at-risk count, renewals due, balances due, today's follow-ups), Slots with attendance marking, Members with search and filters, member profile, record payment, renew, new member, new enquiry, follow-ups with outcomes
- Owner dashboard: collections, dues, active members by tier, renewals due, revenue at risk, 30-day collections chart
- Coach and doctor homes, and a doctor decision flow (approve, approve with limits, hold)
- Database: every wave 1 table, business rules as settings, receipt numbers, member codes, session counting, freezes and extensions, activity log, and access rules for every role, with 35 automated access tests

The app runs on **sample data** until the Supabase project is connected. All names and numbers in the demo are made up.

## For developers

```bash
npm install
npm run dev            # http://localhost:5173 (demo data)
npm run build          # type-check and production build
scripts/test-db.sh     # migrations + access-rule tests on a throwaway local Postgres 16
python3 scripts/screenshots.py http://localhost:4173 shots   # screenshots of every screen (after `npx vite preview`)
```

- `supabase/migrations/` — database schema and access rules
- `supabase/seed.sql` — the studio, owner, three tiers and the weekly timetable
- `supabase/tests/` — access-rule tests (the stubs file is for local testing only)
- `src/data/api.ts` — every read and write the screens use; switches from demo data to Supabase when connected
- `src/screens/` — one folder per role

Look: black and gold (Bodoni Moda headings, Manrope text). All colours are tokens in `src/styles.css`.
