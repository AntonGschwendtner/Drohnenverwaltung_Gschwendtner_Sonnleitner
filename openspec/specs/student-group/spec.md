# student-group Specification

## Purpose

Manages the student groups that can loan drones and are responsible for what they have loaned.

## Requirements

### Requirement: Create student group
The system SHALL allow a student group to be created with a unique name (REQ-003).

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

### Requirement: List student groups
The system SHALL list all student groups with their names, so that a group can be chosen for a loan (REQ-003).

#### Scenario: List student groups
- **GIVEN** the student group "Group 3" exists
- **WHEN** the student groups are listed
- **THEN** the list contains "Group 3"

### Requirement: Search student groups
The student group list SHALL be narrowed by a name search that ignores upper and lower case and matches parts of the name (REQ-011). When no group matches, the list SHALL say so.

#### Scenario: Search by part of the name
- **GIVEN** the student groups "Group 3" and "Robotics Club" exist
- **WHEN** the user searches for "group"
- **THEN** only "Group 3" is shown

#### Scenario: No group matches
- **GIVEN** the student group "Group 3" exists
- **WHEN** the user searches for "xyz"
- **THEN** the list shows that no student group matches the search

### Requirement: Edit student group
The system SHALL allow the name of an existing student group to be changed (REQ-017). The name is required and unique.

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

### Requirement: Delete student group
The system SHALL allow a student group to be deleted only if it never had a loan (REQ-017).

#### Scenario: Delete a group without loans
- **GIVEN** the student group "Group 4" has never loaned a drone
- **WHEN** "Group 4" is deleted
- **THEN** "Group 4" is no longer listed

#### Scenario: Group has loans
- **GIVEN** "Group 3" has a returned loan
- **WHEN** "Group 3" is deleted
- **THEN** the deletion is rejected
- **AND** the returned loan stays in the history
