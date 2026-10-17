# AI CA Assistant

AI-powered Personal Finance + Contract Analyzer platform for individuals and their Chartered Accountants (CAs).

## Stack

- **Backend**: Node.js + Express + TypeScript, Prisma ORM, PostgreSQL, JWT auth, Anthropic Claude API.
- **Frontend**: React 18 + TypeScript + Vite, Redux Toolkit + RTK Query, React Router, Recharts.
- **DB**: PostgreSQL (via Docker Compose).

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres) — or point `DATABASE_URL` at your own Postgres instance
- An [Anthropic API key](https://console.anthropic.com/) (optional — the app runs with realistic stubbed AI output if omitted, see below)

## Setup

### 1. Database

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with the credentials already wired into `server/.env.example`.

### 2. Backend

```bash
cd server
npm install
cp .env.example .env
# Edit .env:
#  - generate JWT_SECRET:   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
#  - generate DATA_ENC_KEY: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#  - add ANTHROPIC_API_KEY if you have one
npx prisma migrate dev
npm run dev
```

The API listens on `http://localhost:4000`.

### 3. Frontend

```bash
cd client
npm install
cp .env.example .env   # defaults to http://localhost:4000/api, adjust if needed
npm run dev
```

Open the printed local URL (Vite defaults to `http://localhost:5173`, but will pick the next free port if that's taken — the backend's CORS config accepts any `localhost` origin in development, so this just works).

## Without an Anthropic API key

Every AI-generated feature (money leaks, subscription analysis, tax suggestions, budget recommendations, forecast commentary, contract risk analysis, email drafts) has a **deterministic fallback** — heuristic/statistical logic that runs with no API key at all, so the whole app is runnable and demoable out of the box. Once `ANTHROPIC_API_KEY` is set in `server/.env`, the same endpoints return real Claude-generated analysis instead of the stub text. No code changes needed either way.

## Feature overview

- **Auth**: register/login as an Individual (`USER`) or Chartered Accountant (`CA`), JWT-based sessions, bcrypt password hashing.
- **CA ↔ Client linking**: a CA invites a client by email; the client must accept before the CA can see any of their data.
- **Personal Finance Assistant**: upload CSV bank/UPI/credit-card statements (HDFC, ICICI, SBI, and generic formats) or PDF bank statements; get category-wise spend charts, money-leak detection, subscription/recurring-payment detection, India-specific tax-saving suggestions (80C/80D/HRA — old regime only, always with a disclaimer), a budget recommendation, and a simple trend-based 3-month cash-flow forecast.
- **Contract Analyzer**: upload a PDF/DOCX contract; get flagged risk clauses, missing standard clauses (indemnity, governing law, dispute resolution, etc.), a renewal/auto-renewal date extraction, a plain-English summary, and an overall Low/Medium/High risk conclusion.
- **CA tools**: view an accepted client's finance summary, insights, and contracts (read-only, access-controlled); draft AI-generated email replies to a client using their financial context — drafts are never auto-sent, a CA must copy them out manually after review/editing.

## Security notes

- Sensitive text (transaction descriptions, extracted contract text) is encrypted at rest with AES-256-GCM.
- Passwords are hashed with bcrypt; JWTs expire after 7 days by default.
- All CA access to client data is re-checked server-side on every request against an `ACCEPTED` link — a CA can never read a client's data by guessing an ID.
- Rate limiting on all API routes, stricter limits on login/register.
- Every AI-generated output carries a disclaimer: **this is AI-generated guidance, not certified financial, tax, or legal advice.**

## Known limitations / assumptions

- Tax guidance assumes the Indian old tax-return regime and commonly known section limits (80C ₹1.5L, 80D ₹25k/50k) — always flagged as "verify with your CA," since exact limits vary by assessment year.
- PDF bank-statement parsing is a best-effort line-based heuristic (bank PDF layouts aren't standardized); CSV export is far more reliable.
- No real email sending is implemented anywhere (by design) — the Email Reply Assistant only produces drafts.
- No password-reset flow yet (out of scope for the initial build).
