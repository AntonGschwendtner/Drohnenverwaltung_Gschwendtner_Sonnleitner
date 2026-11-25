## MODIFIED Requirements

### Requirement: Today page
The application SHALL open on a page "Today" (REQ-036). It SHALL show the number of active loans, loans due today, overdue loans and available drones, and list the overdue loans with the days overdue (most overdue first), the loans due today, the long-running loans and the reservations of today (REQ-028), each with drone and student group.

#### Scenario: Open the app
- **GIVEN** the app is running
- **WHEN** a user opens the address of the app without a page
- **THEN** the page "Today" is shown

#### Scenario: Something is due or late
- **GIVEN** "TELLO-07" is overdue for 3 days, "TELLO-08" for 1 day and "TELLO-09" is due today
- **WHEN** the page "Today" is shown
- **THEN** it counts 2 overdue loans and 1 loan due today
- **AND** it lists "TELLO-07" before "TELLO-08" under overdue and "TELLO-09" under due today

#### Scenario: Nothing is due
- **GIVEN** no active loan is overdue, due today or long-running and nothing is reserved today
- **WHEN** the page "Today" is shown
- **THEN** it says that nothing needs attention today

#### Scenario: Go to the loan
- **GIVEN** the page "Today" lists an overdue loan of "TELLO-07"
- **WHEN** the user follows it
- **THEN** the loan page opens, where the loan can be returned

#### Scenario: Reserved today
- **GIVEN** "TELLO-07" is reserved for "Group 3" today
- **WHEN** the page "Today" is shown
- **THEN** it lists "TELLO-07" for "Group 3" under reserved today
