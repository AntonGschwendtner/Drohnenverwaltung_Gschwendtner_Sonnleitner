# Design

## Context

The student group trash (`student-group-trash`, REQ-033) set the pattern: `DeletedAt` on the entity, an optional foreign key on `Loan` plus a kept name, explicit filters instead of a global query filter, endpoints `trash`, `restore` and `permanent?history=keep|delete`, and a `TrashSection` component. Drones differ in the defect (REQ-024), the status overview (REQ-014), the QR label (REQ-026) and the loan page preselect by QR code.

## Goals / Non-Goals

**Goals:**
- Same behaviour and wording as the group trash, so users learn it once.

**Non-Goals:**
- A shared generic trash component for both entities; the second copy is small and keeps each page simple.

## Decisions

1. **`Drone.DeletedAt`, `Loan.DroneId` optional, `Loan.FormerDroneName`.** Same reasons as decisions 1 and 4 of `student-group-trash`. Loan responses use `Drone.Name ?? FormerDroneName`; `droneId` is `null` for such loans. The filtered unique index "one active loan per drone" stays on `DroneId`; loans without a drone are always returned, so it is unaffected.
2. **Status of a drone in the trash** is computed as before; it is only shown on its detail page.
3. **Refused for a drone in the trash (409):** rename, report defect, repair, new loan. Delete again answers 404. A loaned drone cannot go into the trash (409 with the message to return it first); the permanent delete checks this again in its transaction.
4. **Endpoints** mirror the groups: `DELETE /api/drones/{id}`, `GET /api/drones/trash` (`{ id, name, deletedAt, loanCount }`), `POST /api/drones/{id}/restore`, `DELETE /api/drones/{id}/permanent?history=keep|delete`; `GET /api/drones/{id}` includes `deletedAt`.
5. **Frontend.** A `DroneTrashSection` below the drone list with restore and permanent delete (radio choice, "keep" preselected). The drone detail page shows the trash hint with "Restore" instead of the QR label. The history, group detail and loan pages show a drone without `droneId` as plain text.
6. **Workflow.** `AGENTS.md` now allows several tasks in one branch and pull request; one AI review per pull request.

## Risks / Trade-offs

- [Two trash components with similar code] → Accepted, see Non-Goals.
- [A QR label of a drone in the trash opens the loan page] → The drone is not in the loan list, so the page says that the drone from the QR code does not exist.
