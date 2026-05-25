---
name: project-test-infrastructure
description: Playwright E2E test infrastructure details — config location, run command, global setup, test accounts, env files
metadata:
  type: project
---

## Test infrastructure

- **Config**: `e2e/playwright.config.ts` — baseURL `http://localhost:5173`, single chromium project
- **Tests directory**: `e2e/tests/`
- **Run command**: `bun run test:e2e` from repo root (runs `bun run --filter e2e test`)
- **Global setup**: `e2e/global-setup.ts` — runs `bunx prisma migrate reset --force` against the test DB to seed clean data. Requires `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=yes` env var (added to globalSetup env).
- **Global teardown**: empty — test DB is left intact after runs for inspection
- **Test env file**: `server/.env.test` — loaded by both playwright.config.ts and global-setup.ts

## Test accounts (from seed script)
- Admin: `admin@example.com` / `password123`, name: "Admin", role: "admin"
- Agent: `agent@example.com` / `password123`, name: "Agent", role: "agent"

## webServer config
- Server: `bun src/index.ts` in `server/` cwd, health check at `http://localhost:3001/api/health`
- Client: `bun run dev` in `client/` cwd, port 5173

**Why:** globalSetup previously used `--skip-generate` flag which was removed in current Prisma version; also needs the AI consent env var or Prisma blocks the reset.
**How to apply:** When setting up or modifying globalSetup, always include the `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` env var in the execSync env.
