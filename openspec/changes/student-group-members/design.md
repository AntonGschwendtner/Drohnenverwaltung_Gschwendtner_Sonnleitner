# Design

## Context

`StudentGroup` has only `Id` and `Name`. `StudentGroupService` creates, lists, gets, updates and deletes groups; deleting a group with loans is rejected through the foreign key of `Loan`. The list page `student-groups-page.ts` searches on the client and edits and deletes inline with the shared confirm dialog. The detail page `student-group-detail-page.ts` loads the group and its loans.

## Goals / Non-Goals

**Goals:**
- Members and the leader are part of the student group, not a new top-level resource.
- Same validation style as the rest: `ServiceResult`, ProblemDetails, messages in English and German.

**Non-Goals:**
- Any link between a member and a loan.

## Decisions

1. **Entity `StudentGroupMember`.** `Id`, `StudentGroupId`, `Name` (at most 100), `IsLeader`. Foreign key with `Cascade`, so deleting a group deletes its members while the `Restrict` key of `Loan` still blocks groups with loans. Alternative: a JSON column with names - rejected, the database could not enforce uniqueness and single members could not be changed safely in parallel.
2. **Leader as a flag on the member.** A filtered unique index on `StudentGroupId` where `IsLeader` is true allows at most one leader per group. Removing the leader member removes the leader with it, no dangling reference. Alternative: `StudentGroup.LeaderMemberId` - rejected, it creates a foreign key cycle between group and member and needs extra cleanup when the member is removed.
3. **Uniqueness ignoring case.** Unique index on (`StudentGroupId`, `Name`) with `COLLATE NOCASE`, plus a service check for a clear message. A parallel duplicate hits the index and is mapped to 409 like a duplicate group name.
4. **Endpoints.**
   - `POST /api/student-groups/{id}/members` with `{ "name": "..." }`: 201 with the member, 400 invalid name, 404 unknown group, 409 duplicate.
   - `DELETE /api/student-groups/{id}/members/{memberId}`: 204 or 404.
   - `PUT /api/student-groups/{id}/leader` with `{ "memberId": 5 }` or `{ "memberId": null }`: 200 with the group, 404 for an unknown group or a member of another group. Clearing and setting run in one transaction.
5. **Responses.** `StudentGroupResponse` gets `members` (id, name, `isLeader`; alphabetical) and `leaderName` (or `null`). The list endpoint returns them too, so the members dialog, the leader column and the client-side search need no extra request. A school has few groups with few members, so the payload stays small.
6. **Frontend.** Each row of the student group list gets a "Members (n)" button that opens a dialog (same look as the confirm dialog: focus trap, Escape closes). The dialog lists the members alphabetically with a "Leader" mark, a "Make leader" and a "Remove" button per member, a "No leader" button when a leader is set, and a field with "Add" below. Changes are saved at once through the API and the list row updates from the answer. The list gets a "Group leader" column; the search matches group and member names. The detail page shows the members and the leader read-only.

## Risks / Trade-offs

- [Names of pupils are personal data] → Only the name is stored; members are deleted with their group. Noted in the README.
- [Removing a member without a question] → The dialog asks for confirmation inside the dialog before removing.
- [List response grows with members] → Accepted for school size, see decision 5.
