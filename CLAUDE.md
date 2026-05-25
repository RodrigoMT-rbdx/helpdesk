# Tickets — Project Memory

## What this is
A full-stack support ticket management system. Agents manage inbound tickets, send replies, and get AI-powered classification and reply suggestions via the Claude API.

## Stack
- **Runtime / package manager**: Bun (monorepo with workspaces)
- **Backend**: Express 5 + TypeScript (`/server`)
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4 (`/client`)
- **ORM**: Prisma + PostgreSQL
- **AI**: Anthropic Claude API
- **Auth**: Database sessions via HTTP-only cookies
- **Infra**: Docker, GCP (Cloud Run / Cloud SQL)

## Monorepo layout
```
tickets/
├── client/      # React + Vite app (port 5173 in dev)
├── server/      # Express API (port 3001 in dev)
└── e2e/         # Playwright end-to-end tests
```

## Dev commands
```bash
bun run dev:server   # start Express with --watch
bun run dev:client   # start Vite
```

## Testing — Playwright (e2e/)
**Config**: `e2e/playwright.config.ts` — Chromium only, baseURL `http://localhost:5173`.

**Separate test database**: `helpdesk_test` (config in `server/.env.test`, gitignored).

**Global setup** (`e2e/global-setup.ts`): runs `prisma migrate reset --force` against `helpdesk_test` before each test run — drops, recreates, migrates, and seeds.

**Global teardown** (`e2e/global-teardown.ts`): intentional no-op — test DB is left intact after runs for post-failure inspection.

**Commands**:
```bash
bun run test:e2e        # run all e2e tests (headless)
bun run test:e2e:ui     # open Playwright UI mode
bun run db:test:reset   # manually drop → recreate → migrate → seed helpdesk_test
```

**`server/prisma.config.ts`** loads `.env.test` automatically when `NODE_ENV=test`, so all Prisma CLI commands target the test DB when run with `NODE_ENV=test`.

**Rate limiting** is disabled in dev and test — only active in `production` (`server/src/index.ts`). This prevents Playwright tests from hitting rate limits on auth routes.

## Key conventions
- Server routes live in `server/src/routes/` and are mounted under `/api` in `server/src/index.ts`
- Client proxies `/api/*` to `localhost:3001` via Vite's `server.proxy`
- Tailwind is loaded via `@import "tailwindcss"` in `client/src/index.css` (v4 style, no config file)
- Use context7 MCP server to fetch up-to-date documentation for libraries

## Authentication
**Library**: Better Auth (`better-auth`) — email/password only, **sign-up is disabled** (accounts created via seed script).

**Server** (`server/src/lib/auth.ts`):
- Mounted at `/api/auth/*` via `toNodeHandler(auth)` — must be registered before `express.json()`
- Uses Prisma adapter with PostgreSQL
- Trusted origin configured via `CLIENT_ORIGIN` env var (default: `http://localhost:5173`)
- User has a custom `role` field: `"admin" | "agent"` (default `"agent"`, not settable on input)

**Middleware** (`server/src/middleware/auth.ts`):
- `authMiddleware` — runs on all requests, attaches `req.user` and `req.session` if a valid session cookie exists
- `requireAuth` — guards routes, returns 401 if `req.user` is not set

**Client** (`client/src/lib/auth-client.ts`):
- `authClient` from `better-auth/react`, pointed at `http://localhost:3001`
- Use `authClient.signIn.email({ email, password })` to log in
- Use `authClient.signOut()` to log out
- Use `authClient.useSession()` to read session state in components (`{ data: session, isPending }`)

**Route protection** (client-side, `client/src/App.tsx`):
- `<ProtectedRoute>` component checks `authClient.useSession()` and redirects to `/login` if no session

## UI — shadcn/ui
shadcn/ui is installed in `client/` with the **base-nova** style, **neutral** base color, and CSS variables (Tailwind v4 compatible).

**Add components**: `npx shadcn@latest add <component>` from the `client/` directory.

**Installed components**: `button`, `input`, `label`, `card`, `alert`

**Conventions**:
- Use shadcn design tokens (`text-destructive`, `bg-background`, etc.) — not hardcoded Tailwind color classes
- Form validation errors and server errors use `<Alert variant="destructive"><AlertDescription>…</AlertDescription></Alert>`
- `Input` component suppresses Chrome autofill styles via inset `box-shadow` trick

**Path alias**: `@/*` → `client/src/*` — configured in both `tsconfig.json` and `vite.config.ts`.

**tsconfig quirks**:
- `baseUrl` deprecation warning (TS5.x) is harmless — do NOT add `ignoreDeprecations: "6.0"`, it is invalid in TS 5.x and breaks the build
- `tsconfig.node.json` must not have `allowImportingTsExtensions: true` alongside `composite: true`
- `tsc -b` may emit a `vite.config.js` to the client root — delete it if it appears

## Documentation
Always use **context7** to fetch up-to-date docs before writing code for any library in this project. Resolve the library ID first, then query docs.

Libraries to resolve via context7:
- `Bun` → `/oven-sh/bun`
- `Express` → `/websites/expressjs_en_5`
- `Vite` → `/vitejs/vite`
- `Prisma` → `/prisma/web`
- `React` → resolve fresh each time
- `Tailwind CSS` → resolve fresh each time
- `React Router` → resolve fresh each time
- `Better Auth` → use skill `better-auth-best-practices`
- `shadcn/ui` → `/llmstxt/ui_shadcn_llms_txt`
