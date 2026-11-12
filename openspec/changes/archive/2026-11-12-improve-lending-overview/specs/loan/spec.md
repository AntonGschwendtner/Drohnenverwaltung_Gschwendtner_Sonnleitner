## ADDED Requirements

### Requirement: Loan duration
Every active loan SHALL show how many full days have passed since its loan date (REQ-012). An active loan running longer than 7 full days SHALL be marked as long-running. Returned loans SHALL NOT be marked.

#### Scenario: New loan
- **GIVEN** "TELLO-07" was loaned to "Group 3" today
- **WHEN** the active loans are listed
- **THEN** the loan shows 0 days and is not marked as long-running

#### Scenario: Loan running exactly 7 days
- **GIVEN** "TELLO-07" was loaned to "Group 3" 7 days ago
- **WHEN** the active loans are listed
- **THEN** the loan shows 7 days and is not marked as long-running

#### Scenario: Long-running loan
- **GIVEN** "TELLO-07" was loaned to "Group 3" 9 days ago
- **WHEN** the active loans are listed
- **THEN** the loan shows 9 days and is marked as long-running

### Requirement: Confirm return
Before a loan is returned, the system SHALL ask for confirmation and name the drone and the student group (REQ-013). Only a confirmed return SHALL be saved.

#### Scenario: Confirm the return
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the user chooses Return and confirms
- **THEN** the loan is returned

#### Scenario: Cancel the return
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the user chooses Return and then cancels
- **THEN** the loan stays active and nothing is sent to the server

### Requirement: Search loan history
The loan history SHALL be narrowed by a search that matches the drone name or the student group name, ignoring upper and lower case (REQ-011). When no loan matches, the history SHALL say so.

#### Scenario: Search by student group
- **GIVEN** returned loans of "Group 3" and "Robotics Club" exist
- **WHEN** the user searches for "robotics"
- **THEN** only the loans of "Robotics Club" are shown

#### Scenario: No loan matches
- **GIVEN** a returned loan of "TELLO-07" exists
- **WHEN** the user searches for "xyz"
- **THEN** the history shows that no loan matches the search
