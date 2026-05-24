# After SQL + Realtime — what to do next

## ✅ You already completed

- [x] `001_initial_schema.sql`
- [x] `002_seed_builtin_scenarios.sql`
- [x] Realtime: `session_players`, `lab_sessions`, `student_progress` on `supabase_realtime`

---

## Step 1 — Get API keys (2 minutes)

Supabase → **Project Settings** (gear) → **API**

Copy:

| Name | Use |
|------|-----|
| **Project URL** | Both frontend + backend |
| **anon public** | Frontend `.env.local` |
| **service_role** | Backend `.env` only (secret) |

---

## Step 2 — Create env files (local only, never commit)

```text
SimuRep/backend/.env          ← copy from backend/.env.example
SimuRep/.env.local            ← copy from .env.example
```

Fill in the three Supabase values in `backend/.env`.

---

## Step 3 — Test backend connects to Supabase

```powershell
cd SimuRep\backend
npm install
npm run dev
```

Open in browser: http://localhost:4000/api/db-check

Expected:

```json
{
  "ok": true,
  "scenarios": [
    { "scenario_name": "T-Shirt Factory Line Balancing" },
    { "scenario_name": "Nashama World Cup Factory" }
  ]
}
```

If that works, **database + backend connection are good**.

---

## Step 4 — Keep using the game as-is

The React app still uses **localStorage** until we wire APIs. You can keep running:

```powershell
cd SimuRep
npm run dev
```

No breakage.

---

## Step 5 — What we build next (in order)

1. **Auth** (optional) — Supabase login for instructors/students  
2. **Lab APIs** — `POST /create-session`, `POST /join-session`  
3. **Level engines** — move optimization/workflow/scoring from React → `backend/services/`  
4. **Socket.IO** — rooms = PIN, events from your spec  
5. **Connect frontend** — replace `liveSessionSync.ts` + localStorage gradually  

---

## Optional verification in Supabase

**Table Editor** should show data in `scenarios` (2 rows) and `scenario_tasks` (many rows).

**SQL Editor:**

```sql
SELECT scenario_name FROM scenarios;
```

---

## Send to your developer / Cursor

When ready for the next coding step, provide:

- Project URL  
- Confirm `/api/db-check` works  
- (Do **not** paste `service_role` in public chat)
