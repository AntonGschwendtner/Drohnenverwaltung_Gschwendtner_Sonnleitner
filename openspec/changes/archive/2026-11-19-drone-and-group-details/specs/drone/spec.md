## ADDED Requirements

### Requirement: Drone details
The system SHALL show a single drone with name, description and status, its active loan if there is one, and all its returned loans with student group, accessories, loan date and return date, the newest return first (REQ-018).

#### Scenario: Drone with an active and a returned loan
- **GIVEN** "TELLO-07" was loaned to "Group 4" and returned
- **AND** "TELLO-07" is now loaned to "Group 3"
- **WHEN** the details of "TELLO-07" are shown
- **THEN** the active loan of "Group 3" is shown
- **AND** the returned loan of "Group 4" is listed below it

#### Scenario: Drone that was never loaned
- **GIVEN** "TELLO-09" has never been loaned
- **WHEN** the details of "TELLO-09" are shown
- **THEN** "TELLO-09" is shown as Available without loans

#### Scenario: Unknown drone
- **GIVEN** no drone with the given identity exists
- **WHEN** its details are requested
- **THEN** the request is answered as not found
