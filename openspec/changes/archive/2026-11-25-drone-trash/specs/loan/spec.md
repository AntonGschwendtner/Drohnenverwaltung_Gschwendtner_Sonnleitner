## ADDED Requirements

### Requirement: No loan of a drone in the trash
The system SHALL reject a loan of a drone in the trash (REQ-034).

#### Scenario: Loan a drone in the trash
- **GIVEN** "TELLO-07" is in the trash
- **WHEN** "TELLO-07" is loaned to "Group 3"
- **THEN** the loan is rejected

## MODIFIED Requirements

### Requirement: Loan history
Returned loans SHALL stay stored and SHALL NOT be deleted, except when a user deletes a student group (REQ-033) or a drone (REQ-034) permanently together with its history. The system SHALL list returned loans with student group, drone, accessory quantities, loan date and return date (REQ-010). A loan of a permanently deleted group or drone whose history was kept SHALL keep showing its name.

#### Scenario: Returned loan stays in the history
- **GIVEN** "TELLO-07" was loaned to "Group 3" with 4 batteries and 8 propellers
- **WHEN** the loan is returned
- **AND** the loan history is listed
- **THEN** the history shows the loan with its accessories, loan date and return date

#### Scenario: Same drone is loaned again
- **GIVEN** a returned loan of "TELLO-07" exists
- **WHEN** "TELLO-07" is loaned again
- **THEN** the returned loan stays unchanged in the history

#### Scenario: Loans cannot be deleted
- **GIVEN** a returned loan exists
- **WHEN** a client tries to delete the loan
- **THEN** the request is rejected
- **AND** the loan stays in the history

#### Scenario: Group deleted, history kept
- **GIVEN** "Group 3" returned "TELLO-07" and was deleted permanently with the history kept
- **WHEN** the loan history is listed or exported
- **THEN** the loan of "TELLO-07" is shown with the student group "Group 3"
- **AND** the group name is not a link

#### Scenario: Group deleted with its history
- **GIVEN** "Group 3" returned "TELLO-07" and was deleted permanently together with its history
- **WHEN** the loan history is listed
- **THEN** the loan of "TELLO-07" by "Group 3" is no longer shown

#### Scenario: Drone deleted, history kept
- **GIVEN** "Group 3" returned "TELLO-07" and "TELLO-07" was deleted permanently with the history kept
- **WHEN** the loan history is listed or exported
- **THEN** the loan is shown with the drone "TELLO-07"
- **AND** the drone name is not a link
