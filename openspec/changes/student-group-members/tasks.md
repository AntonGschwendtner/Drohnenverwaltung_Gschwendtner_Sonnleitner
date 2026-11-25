# Tasks

## 1. Data (REQ-031)

- [x] 1.1 Entity `StudentGroupMember` with cascade delete, unique name per group ignoring case and at most one leader per group, migration; tests for "Delete a group with members" and both unique indexes (#177)

## 2. Member API (REQ-031)

- [x] 2.1 `POST /api/student-groups/{id}/members`; tests for "Add a member", "Name is missing", "Name is too long", "Member already in the group", "Same name in another group", "Unknown student group" and the German message (#178)
- [x] 2.2 `DELETE /api/student-groups/{id}/members/{memberId}` and members with leader in the group responses (alphabetical); tests for "Remove a member", "Member of a group with loans", "Unknown member", "Members and leader in the list", "Group without a leader", "Group with members" (#179)
- [x] 2.3 `PUT /api/student-groups/{id}/leader`; tests for "Choose a group leader", "Change the group leader", "Clear the group leader", "Leader from another group", "Remove the group leader" (#180)

## 3. Frontend (REQ-031)

- [x] 3.1 "Members" button and members dialog in the student group list (add, remove with confirmation, make leader, no leader), English and German; component tests for "Open the members", "Group without members", "Add a member in the members view", removing and choosing the leader (#181)
- [x] 3.2 Group leader column and member search in the list, members with leader on the detail page; component tests for "Members and leader in the list", "Search by a member" and "Group with members" (#182)

## 4. Documentation

- [ ] 4.1 REQ-031 in `docs/requirements.md`, domain model and README (#183)
