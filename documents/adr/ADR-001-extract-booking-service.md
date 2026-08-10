# ADR-001 – Extract BookingService from Router

## Status

Accepted

---

## Context

The `bookings.ts` router currently performs multiple responsibilities including:

- HTTP request handling
- Authorization
- Business rule enforcement
- Membership validation
- Credit validation
- Waitlist management
- Booking creation
- Cancellation logic
- Database interaction

This makes the router difficult to read, test, and maintain.

---

## Decision

Extract booking-related business logic into a dedicated `BookingService`.

The router will remain responsible for:

- Request handling
- Zod validation
- Authorization
- Returning responses

The service will become responsible for:

- Booking business rules
- Membership validation
- Waitlist handling
- Credit management
- Booking lifecycle

No API contracts or user-visible behaviour will change.

---

## Consequences

### Advantages

- Smaller routers
- Better separation of concerns
- Easier unit testing
- Business rules centralized

### Trade-offs

- One additional abstraction layer
- Slightly more files to navigate

---

## Alternatives Considered

### Introduce Repository Pattern immediately

Rejected.

Reason:

Introducing both a Service layer and Repository layer simultaneously increases architectural complexity and makes reviewing behaviour changes more difficult.

The repository layer may be introduced later if it provides measurable benefits.