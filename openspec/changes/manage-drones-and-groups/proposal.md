# Proposal

## Why

A drone or student group that was entered with a typo, or that no longer exists, stays in the lists forever. The team wants to correct and remove entries without losing the loan history.

## What Changes

- A drone's name and description can be edited (REQ-015).
- A drone can be deleted as long as it never had a loan (REQ-016).
- A student group's name can be edited, and a group without any loan can be deleted (REQ-017).
- Names stay unique. Entries with loans cannot be deleted, so the history (REQ-010) stays complete.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `drone`: edit and delete drones.
- `student-group`: edit and delete student groups.

## Impact

- Backend: `PUT /api/drones/{id}`, `DELETE /api/drones/{id}`, `PUT /api/student-groups/{id}`, `DELETE /api/student-groups/{id}`. No database change.
- Frontend: edit and delete actions on the drone and student group pages, with confirmation before deleting.
- Docs: REQ-015 to REQ-017, README API table.

## Out of Scope

- Retiring or hiding drones that already have loans (they stay in the list).
- Undo after deleting.
- Editing loans.

## Open Point for the Team

The loan history shows the current name of a drone or group. After a rename, old loans show the new name. This proposal accepts that; the alternative would be to copy the name into every loan.
