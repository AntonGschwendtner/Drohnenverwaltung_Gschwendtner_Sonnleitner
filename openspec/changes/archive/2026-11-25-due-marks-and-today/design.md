# Design

## Context

`LoanService.WithDuration` already computes `daysActive`, `isLongRunning` and `isOverdue` from `TimeProvider` when a loan is read. The loan page lists active loans with a "Long loan" or "Overdue" badge and the class `long-loan`. The routes redirect the empty address and unknown addresses to `/drones`.

## Decisions

1. **`isDueToday` and `daysOverdue` in `LoanResponse`,** computed in `WithDuration` next to `isOverdue`: due today when `dueDate == today`, days overdue `today - dueDate` when positive, otherwise `null`. Computing in the backend keeps the rules in one place (AGENTS.md).
2. **Colours.** Row classes `due-today` (left edge and badge in `--signal`) and `overdue` (left edge and badge in a red alarm colour defined for light and dark), replacing `long-loan` for overdue rows; "Long loan" keeps its existing look.
3. **Today page.** New standalone `TodayPage` at `/today`; it loads `GET /api/loans?status=Active` and `GET /api/drones` once. Tiles like the drone overview (REQ-014); three short lists with drone and group as links and a "To the loans" link per row to `/loans`. The empty address and `**` redirect to `/today`; the brand link and a new first navigation entry "00 Today" point there.

## Risks / Trade-offs

- [The page reads all active loans] → School size, one request; no new endpoint needed.
