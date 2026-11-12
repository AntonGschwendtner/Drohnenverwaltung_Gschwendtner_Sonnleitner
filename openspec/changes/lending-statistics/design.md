# Design

## Context

Loans store `LoanDate`, `ReturnDate` and `Status`. The lists are small (one school). `TimeProvider` gives today's date and is fixed in tests.

## Goals / Non-Goals

**Goals:**
- All figures computed in the backend, testable with the fixed clock.
- Charts that work in both themes without a library.

**Non-Goals:**
- Caching or precomputed tables.

## Decisions

1. **One endpoint.** `GET /api/statistics?from=yyyy-MM-dd&to=yyyy-MM-dd` returns `{ from, to, loanCount, activeCount, averageDays, drones: [{ id, name, loanCount, loanDays }], studentGroups: [...] }`. Without parameters it uses this school year (1 September of the current or the previous year until today). The frontend computes the three periods and sends dates. Alternative: a `period=schoolYear` parameter - rejected, explicit dates are easier to test and allow custom periods later.
2. **Compute in memory.** The service loads the loans of the period with drone and group names and aggregates in C#. `DateOnly` arithmetic in SQLite queries is awkward, and the data is small. Alternative: SQL `GROUP BY` - more complex for the same result at this size.
3. **Zero rows.** Drones and groups are loaded separately and joined with the aggregate, so unused ones appear with 0.
4. **Bars in HTML and CSS.** Each row is a strip with a bar whose width is `loanCount / max`. The numbers stay visible as text, so the chart is readable without colors and by screen readers.

## Risks / Trade-offs

- [Memory aggregation does not scale to very large data] → Acceptable for one school; can move to SQL later without changing the API.
- [School year start differs between schools] → Open point in proposal.md; the start is one constant.
