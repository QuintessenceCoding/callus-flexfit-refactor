# Architecture Overview

## Technology Stack

### Frontend

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS

### Backend

- tRPC
- Drizzle ORM

### Database

- SQLite

---

## High-Level Architecture

Browser
↓
React Components
↓
React Query
↓
tRPC Client
↓
App Router
↓
Business Routers
↓
Drizzle ORM
↓
SQLite Database

---

## Backend Structure

db/
Database schema

server/
Business logic

app/
Routes and pages

components/
Reusable UI

lib/
Shared helpers

---

## Request Lifecycle

1. User performs an action in the UI.
2. React Query executes a query or mutation.
3. The request is sent to a tRPC procedure.
4. `createContext()` executes.
5. Session cookie is read.
6. User session is validated.
7. Appropriate middleware executes.
8. Business logic runs.
9. Drizzle interacts with SQLite.
10. Response is returned to the client.

---

## Authentication Flow

Authentication is session-based.

Flow:

Browser Cookie
↓
Session Token
↓
Sessions Table
↓
Users Table
↓
Authenticated User

The authenticated user is attached to the request context and becomes available to all protected procedures.

---

## Authorization

The project currently exposes three authorization levels:

- Public Procedure
- Protected Procedure
- Staff Procedure
- Admin Procedure

Authorization is centralized inside `server/trpc.ts`, reducing duplication across routers.

---

## Database Layer

Database initialization is centralized in:

src/db/index.ts

Responsibilities:

- Create database client
- Initialize Drizzle
- Export shared database instance
- Export schema

---

## API Layer

Business functionality is separated into domain-specific routers.

Current routers include:

- Authentication
- Members
- Plans
- Classes
- Bookings
- Corporate Bookings
- Payments
- Notifications
- Trainers
- Companies
- Administration
- Reschedules

All routers are combined through a single root router.