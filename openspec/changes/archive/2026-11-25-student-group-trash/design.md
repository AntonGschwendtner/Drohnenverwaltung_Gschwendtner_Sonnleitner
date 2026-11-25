# Design

## Context

`StudentGroupService.DeleteAsync` refuses a group with any loan; `Loan.StudentGroupId` is a required foreign key with `Restrict`. Loan responses read the group name through the navigation, so a renamed group shows its current name in the history (decision of 2026-11-12). Members are deleted with their group by `Cascade` (REQ-031). The history CSV export uses the same loan responses.

## Goals / Non-Goals

**Goals:**
- Nothing is lost by one click: "Delete" is always reversible, only the second step in the trash is final.
- The final step makes the user choose consciously what happens to the history.

**Non-Goals:**
- A general soft delete for all entities.

## Decisions

1. **`StudentGroup.DeletedAt` (date, nullable).** Set from `TimeProvider` when a group goes to the trash, cleared on restore. No EF global query filter: a filter would also hide the group behind loans of the history. The list, the loan check and the trash filter explicitly.
2. **Name stays taken in the trash.** The unique index on `Name` stays over all groups. Create and rename check the trash first to give the message "is in the trash". Restore therefore never collides. Alternative: unique only outside the trash - rejected, restore would need a conflict rule.
3. **Active loan blocks the trash.** A group in the trash must not hold a drone, otherwise the drone could never be returned through the loan page. Returning first is the rule.
4. **Keep the history = `Loan.FormerStudentGroupName`.** `Loan.StudentGroupId` becomes nullable. Permanent delete with "keep" copies the group name into `FormerStudentGroupName` of its loans and clears `StudentGroupId`, then deletes the group (members by cascade), all in one transaction. Loan responses use `StudentGroup.Name ?? FormerStudentGroupName`; `studentGroupId` is `null` for such loans. While the group exists, renames still show the current name.
5. **Delete with the history.** In one transaction the loans of the group are deleted (loan items by cascade), then the group. Only this path deletes loans.
6. **Endpoints.**
   - `DELETE /api/student-groups/{id}`: to the trash, 204; 404 unknown or already in the trash; 409 active loan (message names the drone).
   - `GET /api/student-groups/trash`: `{ id, name, deletedAt, loanCount, memberCount }`, newest deletion first.
   - `POST /api/student-groups/{id}/restore`: 200 with the group; 404 when not in the trash.
   - `DELETE /api/student-groups/{id}/permanent?history=keep|delete`: 204; 404 unknown; 409 not in the trash or still an active loan; 400 without a valid `history`. The active-loan check runs inside the transaction of decisions 4 and 5.
   - Rename, add or remove a member and set the leader answer 409 for a group in the trash ("restore it first"); renaming to the name of a group in the trash answers 409 with the trash message.
   - `GET /api/student-groups/{id}` also answers for a group in the trash and includes `deletedAt`, so links from the history keep working.
   - Creating a loan for a group in the trash answers 409 with a message.
7. **Frontend.** The delete dialog says the group goes to the trash and can be restored. Below the group list a "Trash (n)" section lists the groups with "Restore" and "Delete permanently". The permanent dialog has two radio options, "Keep the history" preselected and "Also delete the history (n loans)"; the confirm button names the chosen action. History, loan and drone pages show a group without `studentGroupId` as plain text. The detail page of a group in the trash shows a hint with "Restore".

## Risks / Trade-offs

- [A loan created while the group moves to the trash] → The trash move and the loan check run in transactions; the loan check reads `DeletedAt`. A rare race leaves an active loan on a group in the trash; the loan can still be returned from the loan page, which lists active loans independent of the group list, and the permanent delete refuses the group until then.
- [Deleting with the history cannot be undone] → Only from the trash, with an explicit choice and the number of loans in the dialog.
- [Domain rule 5 changes] → Documented in the domain model and `openspec/config.yaml`.
