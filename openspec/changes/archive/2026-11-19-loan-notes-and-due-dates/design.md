# Design

## Context

`Loan` stores `LoanDate` and `ReturnDate` as `DateOnly`, set by the backend through `TimeProvider`. The create request is validated in `LoanService` with English and German messages.

## Goals / Non-Goals

**Goals:**
- Keep the overdue rule in the backend, testable with the fixed clock.

**Non-Goals:**
- Editing loans after creation.

## Decisions

1. **Two nullable columns.** `Note` (max 500, `NULL` when empty or blank) and `DueDate` (`DateOnly?`). One migration; existing rows stay valid with `NULL`. Alternative: a separate notes table - not needed for one note per loan.
2. **Note is trimmed.** Blank notes are stored as `NULL`, so "no note" has one form.
3. **`isOverdue` computed in the response.** `Status == Active && DueDate != null && today > DueDate`, with `today` from `TimeProvider`. Never stored, so it cannot get stale.
4. **Date input.** The frontend uses `<input type="date">` with `min` set to today; the backend still validates, because the frontend check is only a convenience.

## Risks / Trade-offs

- [Time zone at midnight] → The backend uses the same date source as for `LoanDate`, so both dates agree.
- [Interaction with the 7-day mark of REQ-012] → Open point in proposal.md.
