# Design

## Context

See proposal.md - Why. The lists are loaded completely (`GET /api/drones`, `/api/student-groups`, `/api/loans?status=...`) and are small (one school). The loan date is stored in UTC; the backend reads the time through `TimeProvider`, which the tests replace with a fixed clock.

## Goals / Non-Goals

**Goals:**
- Keep business rules in the backend: the loan duration and the long-running mark come from the API.
- Keep the domain model and the database unchanged.

**Non-Goals:**
- No new endpoints and no query parameters for searching.

## Decisions

1. **Duration in the backend.** `LoanResponse` gets `daysActive` (full days between loan date and now, active loans only, otherwise `null`) and `isLongRunning` (`daysActive > 7`). Computed in `LoanService` with `TimeProvider`, so tests can set the clock. Alternative: compute in Angular - rejected, because the 7-day rule is a business rule and AGENTS.md puts business logic in the backend.
2. **Threshold as a named constant.** `LoanService.LongRunningAfterDays = 7`. Alternative: configuration in `appsettings.json` - not needed yet, see Out of Scope.
3. **Search and filter in the browser.** A `computed` signal per page filters the loaded list (case-insensitive `includes`). Alternative: query parameters in the API - rejected, the lists are small and the API stays unchanged.
4. **Status overview from the drone list.** The drone page counts the loaded drones by status. No new endpoint.
5. **Own confirmation dialog.** A small dialog in the loan page with the drone and the group name, Confirm and Cancel, Escape cancels, focus starts on Cancel. Alternative: `window.confirm` - rejected, it cannot be styled, cannot be translated reliably and is hard to test.

## Risks / Trade-offs

- [Full days depend on the time of day] → Counted as whole 24-hour periods since the loan date; documented in the spec scenarios.
- [Filtering in the browser does not scale to very large lists] → Acceptable for one school; a server search can follow as its own change.
- [REQ-014 touches "Auswertungen, Statistiken" (out of scope)] → Limited to the current stock; open point for the team in proposal.md.
