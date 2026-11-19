# Design

## Context

`GET /api/loans` requires `status=Active` or `status=Returned` today. The frontend loads full lists and renders them as strips.

## Goals / Non-Goals

**Goals:**
- Detail pages built from small, reusable endpoints.

**Non-Goals:**
- A combined "dashboard" endpoint.

## Decisions

1. **Loan filters as query parameters.** `GET /api/loans?droneId=7` and `?studentGroupId=3`; `status` becomes optional when one of them is given, and the filters can be combined. Without any filter the old rule stays (status required), so existing clients are unchanged. Alternative: nested routes such as `/api/drones/7/loans` - rejected, one list endpoint keeps the sorting rule in one place.
2. **Single records.** `GET /api/drones/{id}` returns the same shape as an item of the drone list (including the status); `GET /api/student-groups/{id}` likewise.
3. **Sorting in the browser.** A small shared sort helper (column, direction) used by every list; headers become buttons with `aria-sort`. Alternative: server sorting - not needed for the list sizes.
4. **Routes.** `/drones/:id` and `/student-groups/:id` with a back link to the list; unknown ids show the not-found message from the backend.

## Risks / Trade-offs

- [Optional `status` makes the endpoint rules more complex] → Covered by tests for each combination.
