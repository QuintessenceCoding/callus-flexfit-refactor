# Refactoring Plan

## Objective

The primary objective of this refactoring effort is to improve the maintainability, readability, testability, and long-term extensibility of the FlexFit Studio codebase while preserving all existing user-visible behaviour.

This is not a feature development effort.

Every existing workflow should continue to behave exactly as before after the refactoring is complete.

---

# Current Assessment

After exploring the application architecture and tracing the core booking flow, the following observations were made.

## Strengths

- Clear domain separation through tRPC routers.
- Strong TypeScript usage.
- Well-defined database schema.
- Centralized authentication and authorization.
- Business rules are largely consistent.
- Good use of Drizzle ORM.

## Weaknesses

- Large router files contain multiple responsibilities.
- Business logic is tightly coupled to HTTP procedures.
- Validation logic is duplicated in several places.
- Some workflows are difficult to unit test because routing and business logic are intertwined.
- Documentation was initially absent.
- Previously observed frontend issue in Schedule page was resolved by stabilizing the query input.

---

# Refactoring Philosophy

The project will follow these principles throughout every refactoring task.

## Behaviour First

Behaviour must never change unless a bug is intentionally fixed and documented.

## Incremental Changes

Large rewrites will be avoided.

Each refactoring should be independently understandable and reviewable.

## Small Commits

Each commit should represent one logical improvement.

## Separation of Concerns

Routers should coordinate requests.

Business rules should live inside services.

Database interaction should remain isolated where appropriate.

## Simplicity

Prefer straightforward, readable code over clever abstractions.

---

# Priority Matrix

| Area                    | Value     | Risk   | Priority |
|-------------------------|----------:|-------:|:--------:|
| Booking Flow            | Very High | Medium | High     |
| Router Responsibilities | High      | Medium | High     |
| Shared Validation       | Medium    | Low    | Medium   |
| Folder Organization     | Medium    | Low    | Medium   |
| Authentication          | Low       | Low    | Low      |
| Payments                | Low       | Low    | Low      |
| Notifications           | Low       | Low    | Low      |

---

# Refactoring Roadmap

## Phase 1 — Stabilization

Goals

- Fix verified bugs.
- Preserve current behaviour.
- Improve documentation.

Expected Outcome

Stable baseline before architectural changes.

---

## Phase 2 — Booking Module

Reason

The booking module contains the highest concentration of business rules.

Goals

- Reduce router complexity.
- Extract business logic.
- Improve readability.
- Keep public API unchanged.

Completed Deliverables

- BookingService extracted from bookings router
- CorporateBookingService extracted from corporate bookings router
- Booking business rules isolated from transport layer
- Router procedures reduced to orchestration and authorization concerns

---

## Phase 3 — Router Cleanup

Goals

- Keep routers focused on request handling.
- Reduce duplicated code.
- Improve consistency between routers.

Potential Deliverables

- Shared utilities
- Cleaner procedure implementations

Current Status

Booking-related routers have been cleaned up through service extraction.
Remaining routers were reviewed and are already relatively small, CRUD-focused, and do not currently justify additional service layers.

---

## Phase 4 — Project Organization

Goals

- Improve folder structure.
- Group related files logically.
- Remove unnecessary coupling.

---

## Phase 5 — Testing

Goals

Protect existing behaviour.

Priority areas

- Booking creation
- Waitlist promotion
- Cancellation
- Credit deduction
- Authentication

Completed

- Booking creation
- Waitlist promotion
- Cancellation
- Credit deduction
- Corporate booking credit pool flows

Pending

- Authentication
- Router-level authorization tests

---

# Success Criteria

The refactoring will be considered successful if:

- Existing functionality is preserved.
- Code readability is improved.
- Business rules become easier to locate.
- Individual functions become smaller.
- Architectural responsibilities become clearer.
- New contributors can understand the codebase more quickly.
- Critical booking workflows covered by automated tests.
---

# Out of Scope

The following items are intentionally excluded.

- UI redesign
- Feature additions
- Performance optimization without evidence
- Database redesign
- API redesign
- Technology stack migration

---

# Risks

Potential risks include:

- Accidentally changing booking behaviour.
- Breaking waitlist promotion.
- Incorrect credit calculations.
- Regression in authentication.
- Hidden dependencies between routers.

Mitigation

- Incremental refactoring.
- Manual verification after each change.
- Preserve API contracts.
- Keep commits small.

---
# Decision Log

| Date | Decision | ADR |
|------|----------|-----|
| 10 Aug | Initial refactoring roadmap created | - |
| 10 Aug | Extract individual booking business logic into BookingService while preserving router contracts | ADR-001 |
| 11 Aug | Extract corporate booking business logic into CorporateBookingService without shared booking abstractions | ADR-002 |
| 11 Aug | Added automated business-rule tests for BookingService and CorporateBookingService | ADR-003 |

---
# Completion Checklist

## Planning

- [x] Explore architecture
- [x] Understand authentication
- [x] Understand booking flow
- [x] Understand class flow

## Documentation

- [x] Product overview
- [x] Architecture
- [x] Domain model
- [x] Request flow
- [x] Feature map
- [x] Known issues
- [x] Project constraints
- [x] Refactoring plan

## Refactoring

- [x] Booking module
- [x] Corporate booking module
- [ ] Router cleanup
- [ ] Project organization

## Testing

- [x] Booking workflow
- [x] Waitlist workflow
- [x] Corporate booking workflow
- [ ] Authentication
- [ ] Schedule

## Final Review

- [ ] Documentation updated
- [ ] ADRs written
- [ ] README finalized
- [ ] Final verification

## Bug Fixes

- [x] Fixed Schedule page query instability
- [x] Documented behavior-changing fixes