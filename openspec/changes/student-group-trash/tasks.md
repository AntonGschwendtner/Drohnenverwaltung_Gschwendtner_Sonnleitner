# Tasks

## 1. Data (REQ-033)

- [x] 1.1 `StudentGroup.DeletedAt`, optional `Loan.StudentGroupId` and `Loan.FormerStudentGroupName`, migration; entity tests (existing loans keep their group) (#200)

## 2. API (REQ-033)

- [x] 2.1 `DELETE /api/student-groups/{id}` moves to the trash, list without the trash, name of a group in the trash stays taken, no loan for a group in the trash; no changes to a group in the trash; tests for "Delete a group without loans", "Delete a group with members", "Group has loans", "Group has an active loan", "Group is already in the trash", "Group in the trash is not listed", "Name of a group in the trash", "Name of a group in the trash when renaming", "Rename a group in the trash", "Change the members of a group in the trash", "Loan for a group in the trash" (#201)
- [x] 2.2 `GET /api/student-groups/trash` and `POST /api/student-groups/{id}/restore`, `deletedAt` in the group details; tests for "Show the trash", "Empty trash", "Restore a group", "Group is not in the trash" (restore), "Open a group in the trash" (#202)
- [x] 2.3 `DELETE /api/student-groups/{id}/permanent?history=keep|delete`, former group name in loan responses and the CSV export; tests for "Keep the history", "Delete with the history", "Group is not in the trash" (permanent), "No choice about the history", "Group in the trash still has a drone", "Group deleted, history kept", "Group deleted with its history" (#203)

## 3. Frontend (REQ-033)

- [x] 3.1 Delete dialog text and trash section on the student group page with restore, English and German; component tests for moving to the trash, "Show the trash", "Empty trash" and "Restore a group" (#204)
- [x] 3.2 Permanent delete dialog with the history choice, deleted group names without link in history, loan and drone pages, trash hint with restore on the group detail page; component tests for both choices, "Group deleted, history kept" and "Open a group in the trash" (#205)

## 4. Documentation

- [ ] 4.1 REQ-033 in `docs/requirements.md`, domain rule 5 and model in `docs/domain-model.md` and `openspec/config.yaml`, README (#206)
