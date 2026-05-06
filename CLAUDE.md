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
└── server/      # Express API (port 3001 in dev)
```

## Dev commands
```bash
bun run dev:server   # start Express with --watch
bun run dev:client   # start Vite
```

## Key conventions
- Server routes live in `server/src/routes/` and are mounted under `/api` in `server/src/index.ts`
- Client proxies `/api/*` to `localhost:3001` via Vite's `server.proxy`
- Tailwind is loaded via `@import "tailwindcss"` in `client/src/index.css` (v4 style, no config file)
- Use context7 MCP server to fetch up-to-date documentation for libraries

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
