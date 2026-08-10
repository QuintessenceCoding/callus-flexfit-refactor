# ADR-002 – Extract CorporateBookingService from Router

## Status

Accepted

---

## Context

The `corporate-bookings.ts` router performs multiple responsibilities including:

- Request handling
- Authorization
- Corporate booking validation
- Company credit validation
- Waitlist management
- Attendance management
- Database interaction

Although the workflow is similar to the individual booking flow, the business rules differ in important ways (company credit pools vs. individual memberships).

---

## Decision

Extract the corporate booking business logic into a dedicated `CorporateBookingService`.

The router will remain responsible for:

- Request handling
- Zod validation
- Authorization
- Returning responses

The service will become responsible for:

- Corporate booking workflow
- Company validation
- Company credit handling
- Waitlist management
- Attendance workflow

No attempt will be made in this refactoring to share logic with `BookingService`.

Any shared abstraction will only be considered after both services have been independently established.

---

## Implementation Notes

The corporate booking service was implemented as:

src/server/services/corporate-booking.service.ts

The `corporate-bookings.ts` router remains responsible for:

- Procedure names and API shape
- Zod input schemas
- Protected and staff procedure selection
- Owner-or-staff cancellation authorization

The service owns only corporate booking domain behavior:

- Corporate booking creation
- Active company lookup
- Company credit pool validation and updates
- Corporate cancellation and refund rules
- Corporate waitlist promotion
- Corporate attendance marking
- Corporate roster and member booking read models

No repository layer, inheritance, shared `BookingEngine`, or deduplication with `BookingService` was introduced.

---

## Consequences

### Advantages

- Consistent backend architecture
- Better separation of concerns
- Easier future comparison with BookingService

### Trade-offs

- Temporary duplication between services
- Shared abstractions intentionally deferred

---

## Alternatives Considered

### Shared Booking Engine

Rejected.

Reason:

The common workflow has not yet been fully analyzed. Introducing a shared abstraction before understanding stable duplication would be premature.
