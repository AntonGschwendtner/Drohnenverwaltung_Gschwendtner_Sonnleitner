## ADDED Requirements

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
