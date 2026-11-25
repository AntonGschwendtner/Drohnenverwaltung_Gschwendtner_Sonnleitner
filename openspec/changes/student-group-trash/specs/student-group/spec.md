## ADDED Requirements

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

## MODIFIED Requirements

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
