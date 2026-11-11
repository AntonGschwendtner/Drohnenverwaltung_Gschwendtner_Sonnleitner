# Proposal

## Why

The lists grow during a school year, and the team asked for a better overview: finding a drone or group quickly, seeing which loans run too long, avoiding a return by mistake, and seeing the fleet status at a glance.

## What Changes

- Search and filter in the lists: drones by name and status, student groups by name, loan history by drone or student group (REQ-011).
- Active loans show how many days they have been running; loans longer than 7 days are marked (REQ-012).
- A return asks for confirmation that names the drone and the student group (REQ-013).
- The drone page shows the number of drones, available drones and loaned drones (REQ-014).
- The domain rules (one active loan per drone, quantities, history) stay unchanged. No breaking API change: the loan response only gets additional fields.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `drone`: search and status filter in the drone list, status overview.
- `student-group`: search in the student group list.
- `loan`: loan duration and long-running mark, return confirmation, search in the loan history.

## Impact

- Backend: the loan response gets `daysActive` and `isLongRunning`, computed from the current time. No database change, no migration.
- Frontend: drone, student group, loan and history pages, new texts in English and German, tests.
- Docs: REQ-011 to REQ-014 in `docs/requirements.md`, README.

## Out of Scope

- Server-side search or paging; the lists are small enough to filter in the browser.
- Reminders or e-mails for long-running loans.
- Statistics over time, charts and exports (still out of scope, see `docs/requirements.md`).
- Changing the 7-day threshold in the interface.

## Open Point for the Team

REQ-014 touches the out-of-scope item "Auswertungen, Statistiken". This proposal treats it as a count of the current stock only. The team decides in the spec review whether that is acceptable.
