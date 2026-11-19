# Proposal

## Why

To answer "who had TELLO-07 last?" or "what does Group 3 have right now?", the user has to search through the whole history. A page per drone and per student group answers this directly. Sorting the lists helps when they grow.

## What Changes

- Drone detail page: name, description, status, the active loan and all past loans of this drone, newest first (REQ-018).
- Student group detail page: the group's active loans and all its past loans, newest first (REQ-019).
- The names in the lists link to these pages.
- Lists can be sorted by clicking a column header; a second click reverses the order (REQ-020).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `drone`: drone details.
- `student-group`: student group details.
- `loan`: loans of one drone or one student group; sorting the loan lists.

## Impact

- Backend: `GET /api/drones/{id}`, `GET /api/student-groups/{id}`, `GET /api/loans` filtered by `droneId` or `studentGroupId`. No database change.
- Frontend: two new routes (`/drones/:id`, `/student-groups/:id`), links in all lists, sortable headers.
- Docs: REQ-018 to REQ-020, README.

## Out of Scope

- Sorting on the server and paging.
- Remembering the sort order after a reload.

## Dependencies

- `export-and-qr-codes` puts the QR code on the drone detail page from this change.
