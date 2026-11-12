# Design

## Context

Loans are created in `LoanService.CreateAsync`, which checks the drone, the group, the accessories and the active loan, and relies on a filtered unique index against double loans. Today's date comes from `TimeProvider`.

## Goals / Non-Goals

**Goals:**
- Same safety against parallel requests as for loans.
- Reservation is its own aggregate; `Loan` stays unchanged.

**Non-Goals:**
- Linking a loan to the reservation it served.

## Decisions

1. **Entity `Reservation`.** `Id`, `DroneId`, `StudentGroupId`, `Date` (`DateOnly`). Unique index on (`DroneId`, `Date`) catches parallel reservations; the service maps the violation to 409 like the loan does. Foreign keys `Restrict`.
2. **Cancel means delete.** No status column: a cancelled or past reservation has no use. Alternative: `Status` with Cancelled - rejected, see Out of Scope (no reservation history).
3. **Loan check.** `CreateAsync` loads the reservation of (`DroneId`, today); if it exists and belongs to another group, 409 with a message naming the group. The drone list gets `reservedTodayFor` (group name or `null`).
4. **Endpoints.** `GET /api/reservations` (today and later, ordered by date, then drone name; each item includes whether the drone is loaned now), `POST /api/reservations`, `DELETE /api/reservations/{id}` (204/404).
5. **Frontend.** New route `/reservations` as "Bay 05", same strip layout; the loan form looks up the next reservation of the chosen drone from the loaded list.

## Risks / Trade-offs

- [Rule interaction with defects and the status overview] → Open points in proposal.md; tests per combination once both changes exist.
- [Deleting removes the trace of a cancelled reservation] → Accepted, see Out of Scope.
