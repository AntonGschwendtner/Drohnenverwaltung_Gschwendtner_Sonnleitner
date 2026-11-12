## ADDED Requirements

### Requirement: Edit drone
The system SHALL allow the name and the description of an existing drone to be changed (REQ-015). The same rules as for creating a drone SHALL apply: the name is required and unique. Editing SHALL NOT change the status of the drone or its loans.

#### Scenario: Correct a name
- **GIVEN** the drone "TELO-07" exists
- **WHEN** its name is changed to "TELLO-07"
- **THEN** the drone is listed as "TELLO-07"

#### Scenario: Edit a loaned drone
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** its description is changed
- **THEN** the description is stored
- **AND** "TELLO-07" stays Loaned

#### Scenario: Name already used
- **GIVEN** the drones "TELLO-07" and "TELLO-08" exist
- **WHEN** the name of "TELLO-08" is changed to "TELLO-07"
- **THEN** the change is rejected

#### Scenario: Unknown drone
- **GIVEN** no drone with the given identity exists
- **WHEN** the drone is edited
- **THEN** the change is rejected as not found

### Requirement: Delete drone
The system SHALL allow a drone to be deleted only if it never had a loan (REQ-016). A drone with an active or returned loan SHALL NOT be deleted, so the loan history stays complete.

#### Scenario: Delete a drone without loans
- **GIVEN** the drone "TELLO-09" has never been loaned
- **WHEN** "TELLO-09" is deleted
- **THEN** "TELLO-09" is no longer listed

#### Scenario: Drone has a returned loan
- **GIVEN** "TELLO-07" was loaned to "Group 3" and returned
- **WHEN** "TELLO-07" is deleted
- **THEN** the deletion is rejected
- **AND** the returned loan stays in the history

#### Scenario: Drone is loaned
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** "TELLO-07" is deleted
- **THEN** the deletion is rejected
