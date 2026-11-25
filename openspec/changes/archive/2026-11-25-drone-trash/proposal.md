# Proposal

## Why

A drone that was ever loaned cannot be deleted, so broken or sold drones stay in every list and in the loan form. The student groups already have a trash (REQ-033) that the user liked; drones shall work the same way.

## What Changes

- **Trash for drones (REQ-034).** "Delete" moves a drone into the trash. A drone in the trash is not listed, not counted in the overview, cannot be loaned and keeps its loans. A loaned drone cannot be deleted; it has to be returned first.
- The drone page shows the trash (on demand) with deletion date and number of loans; a drone is **restored** from there.
- **Delete permanently**, only from the trash, with the same choice as for groups: **keep the history** (loans stay in the history under the drone's name, without a link) or **delete with the history**.
- The name of a drone in the trash stays taken. Renaming, reporting or repairing a defect is refused for a drone in the trash.
- The details of a drone in the trash say so and offer "Restore"; the QR label is not shown for it.
- Workflow: `AGENTS.md` allows several tasks or features in one branch and pull request (user decision of 2026-11-25).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `drone`: delete moves to the trash; trash, restore and permanent delete; names in the trash stay taken; drones in the trash are not listed and cannot be changed.
- `loan`: a drone in the trash cannot be loaned; the history keeps the name of a permanently deleted drone or loses its loans when deleted with the history.

## Impact

- Backend: `Drone.DeletedAt`; `Loan.DroneId` optional and `Loan.FormerDroneName`; one migration. Endpoints `DELETE /api/drones/{id}` (to the trash), `GET /api/drones/trash`, `POST /api/drones/{id}/restore`, `DELETE /api/drones/{id}/permanent?history=keep|delete`.
- Frontend: delete dialog text, trash section on the drone page, permanent delete dialog, drone names without link for permanently deleted drones, trash hint on the drone detail page; English and German.
- Docs: REQ-034, domain rules, README, `AGENTS.md`.

## Out of Scope

- Emptying the trash automatically.
- A common trash page for drones and groups.

## Decision (2026-11-25)

The user asked for "exactly the same for the drones" after the student group trash; built without a further question.
