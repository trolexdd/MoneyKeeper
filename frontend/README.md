# MoneyKeeper frontend

React + TypeScript + Vite dashboard using the Obsidian Finance design system.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

From the repository root:

    cd frontend
    npm install
    npm run dev

Open http://127.0.0.1:5173.

## Current scope

The first dashboard is a responsive UI prototype. Balances, budgets and chart data are illustrative. Adding a transaction updates the current browser session only. Authentication and financial data are not connected to the API yet.

## Production build

    npm run build
