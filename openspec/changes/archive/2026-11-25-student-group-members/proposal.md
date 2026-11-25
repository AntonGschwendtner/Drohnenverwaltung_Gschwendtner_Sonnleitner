# Proposal

## Why

A student group is only a name today. When a drone comes back damaged or a part is missing, the teacher has to ask around who was in "Group 3" and who is responsible for it. The team wants each group to list its members and to name one of them as group leader, so the people behind a loan are known.

## What Changes

- A student group gets **members**: the names of the people in the group (REQ-031).
- Every row of the student group list gets a **"Members"** button with the number of members. It opens the members of that group, in alphabetical order. There members are added by name and removed.
- A name is required, at most 100 characters, and unique within its group, ignoring upper and lower case.
- One member of a group can be chosen as **group leader** (REQ-031). Choosing another member replaces the leader; removing the leader as member leaves the group without a leader. The leader is chosen in the same members view.
- The student group list shows the group leader of each group. The student group detail page shows the members with the leader marked.
- The search in the student group list also finds a group by the name of one of its members.
- Deleting a student group (allowed only without loans) deletes its members with it.

## Capabilities

### New Capabilities

None. Members and the group leader belong to the existing `student-group` capability.

### Modified Capabilities

- `student-group`: members and group leader, shown in the list, the search and the details; members deleted with their group.

## Impact

- Backend: new entity for a member of a student group (`Id`, `StudentGroupId`, `Name`, `IsLeader`), deleted together with its group, unique name per group ignoring case, at most one leader per group; one migration. Endpoints to add and remove a member and to set or clear the leader. The group responses include members and leader.
- Frontend: "Members" button and members dialog in the student group list (add, remove, choose leader), leader column and member search in the list, members on the detail page; English and German texts.
- Docs: REQ-031 in `docs/requirements.md`, README, domain model.

## Out of Scope

- More data about a person than the name (class, e-mail, phone).
- Logins or accounts for members or the leader; the leader gets no extra rights in the app.
- Renaming a member (remove and add instead) and moving a member to another group.
- Recording which member took or returned a drone; a loan stays a loan of the whole group.
- Preventing the same name in two different groups (two people can have the same name).
- Requiring a leader: a group may have no leader, for example while it has no members yet.
