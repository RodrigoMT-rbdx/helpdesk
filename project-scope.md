# AI-Powered Ticket Management System

## Problem

We receive hundreds of support emails daily. Our agents manually read, classify, and respond to each ticket - which is slow and leads to impersonal, canned responses.

## Context

This is an online education platform. Support tickets come from students and cover a range of academic, technical, and billing topics.

## Solution

Build a ticket management system that uses AI to automatically classify, summarize, and suggest responses for support tickets — with agents validating and sending AI suggestions — delivering faster, more personalized responses to students while freeing up agents for complex issues.

## Ticket Statuses

- **Open** — ticket has been received and is awaiting agent action
- **Resolved** — agent has responded and considers the issue addressed
- **Closed** — ticket is fully closed (no further action needed)

## Ticket Categories

- **General Question** — general inquiries about courses, platform, or policies
- **Technical Question** — issues with platform functionality, access, or bugs
- **Refund Request** — requests for refunds or payment disputes

## Roles

- **Admin** — deployed with the system; can create and manage agents; has full access
- **Agent** — created by admin; handles ticket responses and day-to-day operations

## Features

- Receive support emails and create tickets
- AI-powered ticket classification (into one of the three categories above)
- AI summaries of ticket content
- AI-suggested replies generated from a knowledge base — agents must review and approve before sending
- Ticket list with filtering and sorting
- Ticket detail view
- Dashboard to view and manage all tickets
- User management (admin only)
