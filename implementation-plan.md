# Implementation Plan

## Phase 1 — Project Setup

Get the skeleton of the project running end-to-end before writing any business logic.

- [ ] Initialize monorepo structure (`/client`, `/server`)
- [ ] Set up Express + TypeScript app with a health check endpoint
- [ ] Set up React + Vite + TypeScript app
- [ ] Configure Tailwind CSS
- [ ] Set up PostgreSQL database

---

## Phase 2 — Database Schema

- [ ] Set up Prisma
- [ ] Create `docker-compose.yml` for local dev (postgres, backend, frontend)
- [ ] Configure environment variables (`.env` files, `.env.example`)
- [ ] Verify full local stack runs with `docker compose up`


Define the full data model before building features.

- [ ] `User` model — id, name, email, password hash, role (admin | agent), created_at
- [ ] `Session` model — id, user_id, token, expires_at
- [ ] `Ticket` model — id, subject, body, sender_email, status (open | resolved | closed), category (general_question | technical_question | refund_request), created_at, updated_at
- [ ] `Message` model — id, ticket_id, body, sender (agent | system), sent_at
- [ ] `KnowledgeBaseArticle` model — id, title, content, created_at
- [ ] Run initial migration and seed one admin user

---

## Phase 3 — Authentication

- [ ] `POST /auth/login` — validate credentials, create session, set HTTP-only cookie
- [ ] `POST /auth/logout` — destroy session
- [ ] `GET /auth/me` — return current user from session
- [ ] Auth middleware — validate session token on protected routes
- [ ] Role middleware — restrict routes to admin or agent
- [ ] Login page (frontend)
- [ ] Auth context + protected route wrapper in React Router
- [ ] Redirect unauthenticated users to login

---

## Phase 4 — Ticket Ingestion

- [ ] `POST /webhooks/email` — receive parsed inbound email, create a ticket
- [ ] Validate and sanitize incoming webhook payload
- [ ] Map email fields to ticket fields (subject → subject, body → body, from → sender_email)
- [ ] Set initial status to `open`, category to `null` (pending AI classification)

---

## Phase 5 — Ticket Management (Core UI)

- [ ] `GET /tickets` — list tickets with filtering (status, category) and sorting (date, status)
- [ ] `GET /tickets/:id` — ticket detail with messages
- [ ] `PATCH /tickets/:id` — update status or category
- [ ] `POST /tickets/:id/messages` — agent sends a reply
- [ ] Ticket list page — table with filters and sorting controls
- [ ] Ticket detail page — thread view, status badge, category label

---

## Phase 6 — User Management

- [ ] `GET /users` — list all agents (admin only)
- [ ] `POST /users` — create a new agent (admin only)
- [ ] `PATCH /users/:id` — deactivate / reactivate an agent (admin only)
- [ ] User management page — table of agents with create form (admin only)
- [ ] Hide user management nav item from agent role

---

## Phase 7 — AI Features

- [ ] Create Claude API client/service (shared prompt builder, error handling)
- [ ] `POST /tickets/:id/classify` — classify ticket into a category using Claude
- [ ] `POST /tickets/:id/summarize` — generate a short AI summary of the ticket
- [ ] `POST /tickets/:id/suggest-reply` — generate a suggested reply using relevant knowledge base articles as context
- [ ] Auto-trigger classification when a new ticket is created
- [ ] Display AI summary in ticket detail
- [ ] Display AI-suggested reply in an editable textarea; agent can edit, approve, and send
- [ ] Seed knowledge base with sample articles

---

## Phase 8 — Dashboard

- [ ] `GET /dashboard/stats` — total tickets, open count, resolved count, breakdown by category
- [ ] Dashboard page — key metrics cards, recent tickets list

---

## Phase 9 — Deployment

- [ ] `Dockerfile` for backend
- [ ] `Dockerfile` for frontend (static build served via nginx)
- [ ] Production `docker-compose.yml`
- [ ] Configure GCP project (Cloud Run or Compute Engine)
- [ ] Set up Cloud SQL (PostgreSQL) on GCP
- [ ] Push Docker images to Artifact Registry
- [ ] Deploy and verify production environment
- [ ] Configure environment variables and secrets in GCP
