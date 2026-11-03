# MoneyKeeper frontend

React + TypeScript + Vite dashboard using the Obsidian Finance design system.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- Backend API running at http://127.0.0.1:8000

## Run locally

From the repository root:

    cd frontend
    npm install
    npm run dev

Open http://127.0.0.1:5173.

The API base URL defaults to `http://127.0.0.1:8000`. To override it, create `.env.local` in this directory:

    VITE_API_URL=http://127.0.0.1:8000

## Authentication

The frontend supports registration, login, current-user loading, refresh-token rotation, and logout through the FastAPI authentication endpoints.

The current development client stores tokens in `sessionStorage`, so the session is cleared when the browser tab is closed. This is a development-stage approach; before production, move refresh-token handling to Secure, HttpOnly, SameSite cookies and add a production CORS allowlist.

## Transactions and dashboard data

The dashboard reads transaction records and summary data from the authenticated API. Create and delete operations are persisted in PostgreSQL and scoped to the signed-in user. The balance card shows the lifetime balance; the income, expense, chart, and category breakdown follow the selected week/month/year period. Currency is RUB in this first ledger iteration.

Budgets, bank accounts, cards, exports, and editing an existing transaction are not implemented yet. Tokens are held in `sessionStorage` for local development; before production, move refresh-token handling to Secure, HttpOnly, SameSite cookies and configure a production CORS allowlist.

## Production build

    npm run build
