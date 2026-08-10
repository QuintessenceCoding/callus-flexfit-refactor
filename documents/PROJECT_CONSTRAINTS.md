# AI Context

Read this document before generating code.

---

## Goal

Refactor FlexFit Studio into a maintainable codebase while preserving behaviour.

---

## Non-Negotiable Rules

DO NOT

- Change behaviour.
- Change API responses.
- Remove business rules.
- Introduce unnecessary abstractions.
- Rewrite entire modules.

DO

- Extract duplicated logic.
- Improve naming.
- Improve separation of concerns.
- Keep commits small.
- Explain architectural decisions.

---

## Business Rules Already Identified

Booking

- Cannot book cancelled classes.
- Cannot book started classes.
- Active membership required.
- Sufficient credits required.
- Unlimited memberships never lose credits.
- Full classes create waitlist entries.
- Credits deducted only for confirmed bookings.

Cancellation

- Free cancellation until 12 hours before class.
- Refund only if eligible.
- Promote earliest waitlisted member.
- Deduct promoted member's credits.

Authentication

- Session cookie based.
- Context resolves authenticated user.
- Authorization handled through middleware.

---

## Current Architecture

React

↓

React Query

↓

tRPC

↓

Router

↓

Drizzle

↓

SQLite

---

## Preferred Refactoring Style

- Small commits
- Small functions
- Single responsibility
- Clear naming
- Preserve behaviour