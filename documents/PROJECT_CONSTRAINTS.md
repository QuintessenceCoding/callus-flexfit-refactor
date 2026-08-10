# Project Constraints

## Objective

Refactor the existing FlexFit Studio application while preserving all existing functionality and user-visible behaviour.

---

## Non-Negotiable Constraints

- Preserve existing business behaviour.
- Preserve API contracts unless there is a compelling reason to change them.
- Preserve database behaviour.
- Do not introduce breaking changes.
- Prefer incremental refactoring over large rewrites.

---

## Refactoring Principles

- Follow the Single Responsibility Principle.
- Eliminate duplicated logic.
- Keep business rules centralized.
- Improve readability before optimization.
- Prefer composition over duplication.

---

## Code Quality Standards

- Keep functions focused.
- Use descriptive naming.
- Prefer explicit code over clever code.
- Maintain TypeScript type safety.
- Avoid unnecessary abstractions.

---

## Documentation Standards

Every significant architectural decision should be documented.

Every behavioural change should be intentional and recorded.

---

## Testing Philosophy

Existing behaviour should be preserved.

Where practical, new tests should accompany extracted business logic.

---

## Known Objective

The goal is to improve maintainability, readability, and extensibility while ensuring that the application's behaviour remains unchanged.