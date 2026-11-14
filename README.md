# ☕ Corazoncito

A management system for a Latin-inspired coffee shop, built around **full ingredient traceability**: every drink sold deducts the exact quantities in its recipe from inventory. That makes it possible to compare **theoretical vs. actual consumption** (variance) and spot waste as it happens.

Bilingual UI (English / Spanish), detected automatically and switchable at runtime.

## Stack

| Layer     | Technology                                     |
| --------- | ---------------------------------------------- |
| Frontend  | React 19, Vite, TypeScript, Tailwind CSS v4    |
| Backend   | Node 20, Fastify 5, TypeScript                 |
| Database  | SQLite with Drizzle ORM (schema + migrations)  |
| Auth      | JWT: short-lived access token + refresh token in an httpOnly cookie |
| i18n      | react-i18next (en / es)                        |

A pnpm-workspaces monorepo with two packages: `backend/` and `frontend/`.

## Key design decisions

- **Atomic stock movements.** Registering an inventory entry or a sale updates `current_stock` inside a single database transaction, so stock never drifts from the ledger.
- **Append-only inventory ledger.** Entries are never edited in place; stock is always explainable from its history.
- **Variance reporting.** `variance = purchased − theoretical consumption` per ingredient over a date range. Theoretical consumption comes from recipes × sales.
- **Theoretical drink cost** is computed from each ingredient's average purchase cost.
- **Role-based access** enforced per route on the server, not just hidden in the UI.
- **Lock-out guards:** an owner can't remove their own access, and there is always at least one active owner.
- **Token rotation:** access tokens are kept short-lived; the refresh endpoint rotates tokens from the httpOnly cookie, so the refresh token is never exposed to JavaScript.

## Roles

| Role    | Access                                                         |
| ------- | -------------------------------------------------------------- |
| owner   | Everything: users, recipes, prices, inventory, reports          |
| manager | Operations and reports; cannot manage users, prices or recipes  |
| barista | Records sales only                                             |

## Features

1. **Auth**: login, JWT access + refresh, `requireAuth` / `requireRole` middleware, `/me`, password change. Persistent sessions and protected routes on the frontend.
2. **Users**: owner-only CRUD, password reset, lock-out guards.
3. **Ingredients**: CRUD with a stock indicator (green / yellow / red against `min_stock`). Deletion is blocked while an ingredient is used in a recipe.
4. **Suppliers**: CRUD (name, contact, notes).
5. **Inventory entries**: append-only ledger; each entry adds to stock atomically.
6. **Products (drinks)**: CRUD; readable by all roles, writable by the owner.
7. **Recipes**: replace a drink's full recipe in one call; returns the theoretical cost.
8. **Sales**: deducts recipe ingredients from stock atomically and warns when an ingredient falls below its minimum. Daily shift summary.
9. **Reports**: ingredient variance by date range.

## Getting started

Requirements: Node 20 (see `.nvmrc`) and pnpm 9 (`corepack enable && corepack prepare pnpm@9.15.9 --activate`).

```bash
# 1. Install dependencies (from the repo root)
pnpm install

# 2. Configure the backend
cp backend/.env.example backend/.env

# 3. Create the database and seed the initial owner account
pnpm db:migrate
pnpm db:seed
#   → email: owner@corazoncito.cafe · password: corazoncito123 (development only)

# 4. Run the API (:3001) and the UI (:5173) in parallel
pnpm dev
```

Open http://localhost:5173 and sign in with the seeded account. Vite proxies `/api` to `http://localhost:3001`, so httpOnly cookies work on the same origin during development.

| Command             | What it does                               |
| ------------------- | ------------------------------------------ |
| `pnpm dev`          | backend + frontend in parallel             |
| `pnpm dev:backend`  | API only                                   |
| `pnpm dev:frontend` | UI only                                    |
| `pnpm db:generate`  | generate a Drizzle migration from the schema |
| `pnpm db:migrate`   | apply migrations                           |
| `pnpm db:seed`      | create the initial owner account           |
| `pnpm build`        | build backend and frontend                 |

## API

REST + JSON under `/api/v1`. The `auth` routes are public; everything else requires `Authorization: Bearer <accessToken>` and a per-route role check.

| Method | Route                              | Description                        |
| ------ | ---------------------------------- | ---------------------------------- |
| POST   | `/auth/login`                      | email + password → access token    |
| POST   | `/auth/refresh`                    | rotate tokens from the cookie      |
| POST   | `/auth/logout`                     | clear the refresh cookie           |
| GET    | `/auth/me`                         | current user                       |
| POST   | `/auth/change-password`            | change own password                |
| GET / POST | `/users`                       | list / create users (owner)        |
| PATCH / DELETE | `/users/:id`               | edit / delete a user (owner)       |
| POST   | `/users/:id/reset-password`        | reset a password (owner)           |
| GET / POST | `/ingredients`                 | list with stock status / create    |
| PATCH / DELETE | `/ingredients/:id`         | edit / delete if unused            |
| GET / POST | `/suppliers`                   | list / create                      |
| PATCH / DELETE | `/suppliers/:id`           | edit / delete                      |
| GET / POST | `/inventory`                   | ledger / add an entry (adds stock) |
| GET / POST | `/products`                    | list (all roles) / create (owner)  |
| GET / PATCH / DELETE | `/products/:id`      | drink + recipe + theoretical cost / edit / delete if no sales |
| PUT    | `/products/:id/recipe`             | replace the recipe (owner)         |
| GET / POST | `/sales`                       | recent sales / record a sale (deducts stock) |
| GET    | `/sales/today`                     | shift summary by drink             |
| GET    | `/reports/variance?from&to`        | variance per ingredient            |

## Running a public QA build

`./start-public.sh` builds the frontend, serves UI + API from a single process on `:3001`, and opens a temporary Cloudflare tunnel with a public `https://…trycloudflare.com` URL. Requires `cloudflared`. The URL changes on every restart; it's meant for QA, not production. Change the seeded passwords before sharing it.

## Roadmap

- Automated tests for the stock, sales and variance logic
- Hosted deployment (Railway / Fly.io)
- Postgres for multi-location use
