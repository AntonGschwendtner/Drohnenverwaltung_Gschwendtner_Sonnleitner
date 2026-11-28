# student-group Specification

## Purpose

Manages the student groups that can loan drones and are responsible for what they have loaned.

## Requirements

### Requirement: Create student group
The system SHALL allow a student group to be created with a unique name (REQ-003). The name of a group in the trash stays taken (REQ-033).

#### Scenario: Create a student group
- **GIVEN** no student group named "Group 3" exists
- **WHEN** a student group is created with the name "Group 3"
- **THEN** the student group is stored

#### Scenario: Name is missing
- **GIVEN** the system is running
- **WHEN** a student group is created without a name
- **THEN** the creation is rejected

#### Scenario: Name already exists
- **GIVEN** a student group named "Group 3" exists
- **WHEN** another student group is created with the name "Group 3"
- **THEN** the creation is rejected

#### Scenario: Name of a group in the trash
- **GIVEN** "Group 3" is in the trash
- **WHEN** a student group is created with the name "Group 3"
- **THEN** the creation is rejected with a message that "Group 3" is in the trash

### Requirement: List student groups
The system SHALL list all student groups that are not in the trash with their names, so that a group can be chosen for a loan (REQ-003, REQ-033). Each group SHALL show how many members it has and who its group leader is (REQ-031).

#### Scenario: List student groups
- **GIVEN** the student group "Group 3" exists
- **WHEN** the student groups are listed
- **THEN** the list contains "Group 3"

#### Scenario: Members and leader in the list
- **GIVEN** "Group 3" has the members "Anna Huber" and "Ben Wagner", and "Anna Huber" is its group leader
- **WHEN** the student groups are listed
- **THEN** "Group 3" is listed with 2 members and the group leader "Anna Huber"

#### Scenario: Group without a leader
- **GIVEN** "Group 4" has no group leader
- **WHEN** the student groups are listed
- **THEN** "Group 4" is listed without a group leader

#### Scenario: Group in the trash is not listed
- **GIVEN** "Group 3" is in the trash and "Group 4" is not
- **WHEN** the student groups are listed
- **THEN** the list contains "Group 4" and not "Group 3"

### Requirement: Search student groups
The student group list SHALL be narrowed by a search that ignores upper and lower case and matches parts of the group name (REQ-011) or of the name of one of its members (REQ-031). When no group matches, the list SHALL say so.

#### Scenario: Search by part of the name
- **GIVEN** the student groups "Group 3" and "Robotics Club" exist
- **WHEN** the user searches for "group"
- **THEN** only "Group 3" is shown

#### Scenario: Search by a member
- **GIVEN** "Anna Huber" is a member of "Group 3" and not of "Robotics Club"
- **WHEN** the user searches for "huber"
- **THEN** only "Group 3" is shown

#### Scenario: No group matches
- **GIVEN** the student group "Group 3" exists
- **WHEN** the user searches for "xyz"
- **THEN** the list shows that no student group matches the search

### Requirement: Edit student group
The system SHALL allow the name of an existing student group to be changed (REQ-017). The name is required and unique; the name of a group in the trash stays taken (REQ-033).

#### Scenario: Correct a name
- **GIVEN** the student group "Grup 3" exists
- **WHEN** its name is changed to "Group 3"
- **THEN** the student group is listed as "Group 3"

#### Scenario: Name already used
- **GIVEN** the student groups "Group 3" and "Group 4" exist
- **WHEN** the name of "Group 4" is changed to "Group 3"
- **THEN** the change is rejected

#### Scenario: Unknown student group
- **GIVEN** no student group with the given identity exists
- **WHEN** the student group is edited
- **THEN** the change is rejected as not found

#### Scenario: Name of a group in the trash when renaming
- **GIVEN** "Group 3" is in the trash and "Group 4" is not
- **WHEN** the name of "Group 4" is changed to "Group 3"
- **THEN** the change is rejected with a message that "Group 3" is in the trash

### Requirement: Delete student group
The system SHALL move a deleted student group into the trash with its members and loans (REQ-017, REQ-033). A group with an active loan SHALL NOT be deleted.

#### Scenario: Delete a group without loans
- **GIVEN** the student group "Group 4" has never loaned a drone
- **WHEN** "Group 4" is deleted
- **THEN** "Group 4" is no longer listed
- **AND** "Group 4" is in the trash

#### Scenario: Delete a group with members
- **GIVEN** "Group 4" has the member "Anna Huber"
- **WHEN** "Group 4" is deleted
- **THEN** "Group 4" is in the trash with its member "Anna Huber"

#### Scenario: Group has loans
- **GIVEN** "Group 3" has a returned loan
- **WHEN** "Group 3" is deleted
- **THEN** "Group 3" is no longer listed and is in the trash
- **AND** the returned loan stays in the history

#### Scenario: Group has an active loan
- **GIVEN** "Group 3" has loaned "TELLO-07" and not returned it
- **WHEN** "Group 3" is deleted
- **THEN** the deletion is rejected with a message that "TELLO-07" has to be returned first
- **AND** "Group 3" stays listed

#### Scenario: Group is already in the trash
- **GIVEN** "Group 3" is in the trash
- **WHEN** "Group 3" is deleted again
- **THEN** the request is answered as not found
- **AND** "Group 3" stays in the trash with its deletion date

### Requirement: Student group details
The system SHALL show a single student group with its members in alphabetical order and its group leader (REQ-031), its active loans and all its returned loans with drone, accessories, loan date and return date, the newest return first (REQ-019).

#### Scenario: Group with active and returned loans
- **GIVEN** "Group 3" has loaned "TELLO-07" and has returned "TELLO-08"
- **WHEN** the details of "Group 3" are shown
- **THEN** "TELLO-07" is shown as active
- **AND** "TELLO-08" is listed as returned

#### Scenario: Group with members
- **GIVEN** "Group 3" has the members "Ben Wagner" and "Anna Huber", and "Anna Huber" is its group leader
- **WHEN** the details of "Group 3" are shown
- **THEN** the members are listed as "Anna Huber", "Ben Wagner"
- **AND** "Anna Huber" is marked as group leader

#### Scenario: Unknown student group
- **GIVEN** no student group with the given identity exists
- **WHEN** its details are requested
- **THEN** the request is answered as not found

### Requirement: Add member
The system SHALL allow a member to be added to an existing student group by name (REQ-031). The name is required, at most 100 characters long and unique within its group, ignoring upper and lower case. Leading and trailing spaces are not stored.

#### Scenario: Add a member
- **GIVEN** the student group "Group 3" has no member named "Anna Huber"
- **WHEN** "Anna Huber" is added to "Group 3"
- **THEN** "Anna Huber" is a member of "Group 3"

#### Scenario: Name is missing
- **GIVEN** the student group "Group 3" exists
- **WHEN** a member without a name is added to "Group 3"
- **THEN** the member is rejected

#### Scenario: Name is too long
- **GIVEN** the student group "Group 3" exists
- **WHEN** a member with a name of 101 characters is added to "Group 3"
- **THEN** the member is rejected

#### Scenario: Member already in the group
- **GIVEN** "Anna Huber" is a member of "Group 3"
- **WHEN** "anna huber" is added to "Group 3"
- **THEN** the member is rejected

#### Scenario: Same name in another group
- **GIVEN** "Anna Huber" is a member of "Group 3"
- **WHEN** "Anna Huber" is added to "Group 4"
- **THEN** "Anna Huber" is a member of "Group 3" and of "Group 4"

#### Scenario: Unknown student group
- **GIVEN** no student group with the given identity exists
- **WHEN** a member is added to it
- **THEN** the member is rejected as not found

### Requirement: Remove member
The system SHALL allow a member to be removed from its student group (REQ-031). Loans of the group are not affected. Removing the group leader leaves the group without a leader.

#### Scenario: Remove a member
- **GIVEN** "Anna Huber" is a member of "Group 3"
- **WHEN** "Anna Huber" is removed from "Group 3"
- **THEN** "Group 3" no longer lists "Anna Huber"

#### Scenario: Member of a group with loans
- **GIVEN** "Anna Huber" is a member of "Group 3" and "Group 3" has an active loan
- **WHEN** "Anna Huber" is removed from "Group 3"
- **THEN** "Anna Huber" is removed
- **AND** the active loan of "Group 3" stays unchanged

#### Scenario: Remove the group leader
- **GIVEN** "Anna Huber" is the group leader of "Group 3"
- **WHEN** "Anna Huber" is removed from "Group 3"
- **THEN** "Group 3" has no group leader

#### Scenario: Unknown member
- **GIVEN** "Group 3" has no member with the given identity
- **WHEN** that member is removed from "Group 3"
- **THEN** the removal is rejected as not found

### Requirement: Group leader
The system SHALL allow one member of a student group to be chosen as its group leader and the choice to be cleared (REQ-031). A group has at most one leader; choosing another member replaces the leader. Only a member of the group itself can be its leader.

#### Scenario: Choose a group leader
- **GIVEN** "Anna Huber" is a member of "Group 3" and "Group 3" has no group leader
- **WHEN** "Anna Huber" is chosen as group leader of "Group 3"
- **THEN** "Anna Huber" is the group leader of "Group 3"

#### Scenario: Change the group leader
- **GIVEN** "Anna Huber" is the group leader of "Group 3" and "Ben Wagner" is a member of "Group 3"
- **WHEN** "Ben Wagner" is chosen as group leader of "Group 3"
- **THEN** "Ben Wagner" is the group leader of "Group 3"
- **AND** "Anna Huber" is still a member of "Group 3" but no longer its leader

#### Scenario: Clear the group leader
- **GIVEN** "Anna Huber" is the group leader of "Group 3"
- **WHEN** the group leader of "Group 3" is cleared
- **THEN** "Group 3" has no group leader
- **AND** "Anna Huber" is still a member of "Group 3"

#### Scenario: Leader from another group
- **GIVEN** "Ben Wagner" is a member of "Group 4" and not of "Group 3"
- **WHEN** "Ben Wagner" is chosen as group leader of "Group 3"
- **THEN** the choice is rejected as not found

### Requirement: Members view
The student group list SHALL offer a "Members" button with the number of members for every group (REQ-031). It SHALL open the members of that group in alphabetical order with the group leader marked, where members are added and removed and the group leader is chosen or cleared.

#### Scenario: Open the members
- **GIVEN** "Group 3" has the members "Ben Wagner" and "Anna Huber", and "Anna Huber" is its group leader
- **WHEN** the user clicks "Members" in the row of "Group 3"
- **THEN** the members are shown as "Anna Huber", "Ben Wagner"
- **AND** "Anna Huber" is marked as group leader

#### Scenario: Group without members
- **GIVEN** "Group 4" has no members
- **WHEN** the user opens the members of "Group 4"
- **THEN** the view says that the group has no members yet

#### Scenario: Add a member in the members view
- **GIVEN** the members of "Group 3" are open
- **WHEN** the user enters "Clara Berger" and adds it
- **THEN** "Clara Berger" appears in the members of "Group 3"
- **AND** the number on the "Members" button of "Group 3" goes up by one

### Requirement: Student group trash
The system SHALL show the student groups in the trash with their name, the date they were deleted and how many loans and members they have, the most recently deleted first (REQ-033). The details of a group in the trash SHALL say that it is in the trash.

#### Scenario: Show the trash
- **GIVEN** "Group 3" with 2 returned loans and 3 members was deleted on 20.08.2026
- **WHEN** the trash is shown
- **THEN** it lists "Group 3" with the date 20.08.2026, 2 loans and 3 members

#### Scenario: Empty trash
- **GIVEN** no student group is in the trash
- **WHEN** the trash is shown
- **THEN** the trash says that it is empty

#### Scenario: Open a group in the trash
- **GIVEN** "Group 3" is in the trash
- **WHEN** the details of "Group 3" are opened, for example from the history
- **THEN** the details say that "Group 3" is in the trash
- **AND** its loans are still shown

### Requirement: Restore student group
The system SHALL restore a student group from the trash with its members and loans (REQ-033).

#### Scenario: Restore a group
- **GIVEN** "Group 3" with the member "Anna Huber" and a returned loan is in the trash
- **WHEN** "Group 3" is restored
- **THEN** "Group 3" is listed again with the member "Anna Huber"
- **AND** it can loan drones again
- **AND** its returned loan is still in the history

#### Scenario: Group is not in the trash
- **GIVEN** "Group 4" is not in the trash
- **WHEN** "Group 4" is restored
- **THEN** the request is answered as not found

### Requirement: Delete student group permanently
The system SHALL delete a student group from the trash for good, together with its members (REQ-033). The user SHALL choose whether its loans stay in the history under the group's name or are deleted with it. Only a group in the trash can be deleted permanently.

#### Scenario: Keep the history
- **GIVEN** "Group 3" with a returned loan of "TELLO-07" is in the trash
- **WHEN** "Group 3" is deleted permanently and the history is kept
- **THEN** "Group 3" and its members are no longer stored and not in the trash
- **AND** the history still shows the loan of "TELLO-07" by "Group 3"

#### Scenario: Delete with the history
- **GIVEN** "Group 3" with a returned loan of "TELLO-07" is in the trash and "Group 4" has a returned loan of "TELLO-08"
- **WHEN** "Group 3" is deleted permanently together with its history
- **THEN** "Group 3", its members and its loans are no longer stored
- **AND** the history still shows the loan of "TELLO-08" by "Group 4"

#### Scenario: Group is not in the trash
- **GIVEN** "Group 4" is not in the trash
- **WHEN** "Group 4" is deleted permanently
- **THEN** the deletion is rejected
- **AND** "Group 4" stays listed

#### Scenario: No choice about the history
- **GIVEN** "Group 3" is in the trash
- **WHEN** "Group 3" is deleted permanently without saying what happens to its history
- **THEN** the deletion is rejected
- **AND** "Group 3" stays in the trash

#### Scenario: Group in the trash still has a drone
- **GIVEN** "Group 3" is in the trash and still has an active loan of "TELLO-07"
- **WHEN** "Group 3" is deleted permanently
- **THEN** the deletion is rejected with a message that "TELLO-07" has to be returned first
- **AND** "Group 3" and the active loan stay unchanged

### Requirement: Empty the student group trash
The system SHALL delete all student groups in the trash permanently at once after a confirmation, in one step that deletes either all of them or none (REQ-033), with their members and with one history choice for all of them. A group that still has an active loan SHALL stay in the trash.

#### Scenario: Empty the student group trash
- **GIVEN** "Group 3" with a returned loan and "Group 4" are in the trash and "Group 5" is not
- **WHEN** the student group trash is emptied and the history is kept
- **THEN** the trash is empty and "Group 5" is still listed
- **AND** the history still shows the loan of "Group 3"

#### Scenario: No choice about the history when emptying
- **WHEN** the student group trash is emptied without saying what happens to the history
- **THEN** the request is rejected

### Requirement: No changes in the trash
The system SHALL reject renaming a student group in the trash, adding or removing its members and choosing or clearing its group leader (REQ-033). The group has to be restored first.

#### Scenario: Rename a group in the trash
- **GIVEN** "Group 3" is in the trash
- **WHEN** "Group 3" is renamed to "Group 33"
- **THEN** the change is rejected with a message that "Group 3" is in the trash
- **AND** "Group 3" keeps its name

#### Scenario: Change the members of a group in the trash
- **GIVEN** "Group 3" with the member "Anna Huber" is in the trash
- **WHEN** a member is added to "Group 3", "Anna Huber" is removed or chosen as group leader
- **THEN** each change is rejected
- **AND** the members of "Group 3" stay unchanged
