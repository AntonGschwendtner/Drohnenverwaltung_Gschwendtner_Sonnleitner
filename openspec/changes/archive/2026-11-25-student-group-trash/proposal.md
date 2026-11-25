# Proposal

## Why

A student group that ever loaned a drone cannot be deleted today, so groups of past school years stay in every list and in the loan form forever. The team wants to get rid of such groups, but must not lose a history by accident: some want to keep the history of a deleted group, some want everything about the group gone.

## What Changes

- **Trash for student groups (REQ-033).** "Delete" moves a group into the trash instead of refusing it. A group in the trash is no longer listed, cannot loan drones and keeps its members and loans. This works for every group, also for groups with returned loans.
- A group that has a drone right now (active loan) cannot be deleted; the drone has to be returned first.
- The student group page shows the trash with the deletion date, the number of loans and members of each group. From there a group is **restored** with everything it had.
- **Delete permanently**, only from the trash, with a choice:
  - **Keep the history** (suggested): the group and its members are deleted; its returned loans stay in the history under the group's name, without a link.
  - **Delete with the history**: the group, its members and all its loans are deleted for good. The dialog says how many loans this removes.
- The name of a group in the trash stays taken, so a restore never collides; creating a group with that name says the group is in the trash.
- **BREAKING (domain rule 5):** "Returned loans stay stored" gets one exception: a user deletes a student group permanently together with its history.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `student-group`: delete moves to the trash; trash, restore and permanent delete; names in the trash stay taken; groups in the trash are not listed.
- `loan`: a group in the trash cannot loan; the history keeps the name of a permanently deleted group or loses its loans when deleted with the history.

## Impact

- Backend: `StudentGroup.DeletedAt` (date, empty while not in the trash); `Loan.StudentGroupId` becomes optional and `Loan.FormerStudentGroupName` keeps the name when the group is deleted with "keep the history"; one migration. Endpoints: `DELETE /api/student-groups/{id}` (to the trash), `GET /api/student-groups/trash`, `POST /api/student-groups/{id}/restore`, `DELETE /api/student-groups/{id}/permanent?history=keep|delete`.
- Frontend: new delete dialog text, trash section with restore and permanent delete (with the choice), history and detail pages show a deleted group's name without a link, the detail page of a group in the trash says so and offers restore; English and German.
- Docs: REQ-033, domain rule 5, domain model, README.

## Out of Scope

- A trash for drones (the same pattern can follow as its own change).
- Emptying the trash automatically after some time.
- Deleting single loans from the history.
- Undoing a permanent delete.

## Decision (2026-11-25)

The user asked to build it as proposed.
