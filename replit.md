# Lounge — Real-time Chat App

A minimal Slack-style chat lounge. Users pick a display name (no auth), browse and create rooms, and exchange messages that persist to Postgres.

## Architecture

- **Frontend** (`artifacts/chat`) — React + Vite + Tailwind + shadcn/ui, wouter for routing, TanStack Query for data + polling-based real-time updates (2.5s for messages, 5–10s for everything else).
- **API server** (`artifacts/api-server`) — Express, mounted at `/api`. Routes:
  - `POST /api/users`, `GET /api/users/:id` — display-name signup, lookup
  - `GET/POST /api/rooms`, `GET /api/rooms/:id`, `GET /api/rooms/:id/members`
  - `GET/POST /api/rooms/:id/messages`
  - `GET /api/dashboard/summary`, `GET /api/dashboard/recent-activity`
- **Database** (`lib/db`) — PostgreSQL via Drizzle ORM. Tables: `users`, `rooms`, `messages` (with FK + cascade and indexes on `(room_id, created_at)` and `created_at`).
- **API contract** (`lib/api-spec`) — OpenAPI 3.1 spec generates Zod schemas (`lib/api-zod`) and a typed React Query client (`lib/api-client-react`) via Orval.

## Authentication

No password-based or OAuth auth. Display name is captured on first visit, the resulting user record is persisted in `localStorage` (`chat:user`), and the user id is sent in message payloads. If a stored user no longer exists in the DB on load, they are signed out automatically.

## Pages

- `/` — Welcome (when signed out) or Dashboard (rooms + summary stats + recent activity feed)
- `/rooms/:roomId` — Chat view (messages, input, member sidebar)

## Notable conventions

- The chat artifact serves at `/`; the api-server artifact serves at `/api`. Path-based routing means no proxy config is needed in the chat's `artifact.toml`.
- The chat client builds its API base URL as `${import.meta.env.BASE_URL}api` so dev + prod both work.
- Avatar colors are deterministically picked from a fixed palette based on the display name hash.
- Seed data (3 rooms, 4 users, 10 messages) is in `artifacts/api-server/src/seed.ts`. Re-running is idempotent (skips when rooms already exist).

## Running

- `pnpm --filter @workspace/api-spec run codegen` — regenerate Zod + React Query client from `openapi.yaml`
- `pnpm --filter @workspace/db run push` — push schema changes to Postgres
- Workflows `artifacts/chat: web` and `artifacts/api-server: API Server` run dev servers
