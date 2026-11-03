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

## Current scope

Dashboard balances, budgets, chart data, and sample transactions are still illustrative. The add-transaction modal currently changes only React state and does not persist data. Financial accounts, transactions, and analytics API endpoints are the next backend milestone.

## Production build

    npm run build
