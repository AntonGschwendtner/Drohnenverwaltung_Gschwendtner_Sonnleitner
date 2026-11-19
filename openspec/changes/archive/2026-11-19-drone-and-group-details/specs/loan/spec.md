## ADDED Requirements

### Requirement: Loans of one drone or one student group
The system SHALL list the loans of a single drone or of a single student group, active and returned together, the active loan first and then the newest return first (REQ-018, REQ-019).

#### Scenario: Loans of one drone
- **GIVEN** "TELLO-07" and "TELLO-08" each have a returned loan
- **WHEN** the loans of "TELLO-07" are listed
- **THEN** only the loan of "TELLO-07" is shown

#### Scenario: Loans of one student group
- **GIVEN** "Group 3" and "Group 4" each have an active loan
- **WHEN** the loans of "Group 3" are listed
- **THEN** only the loan of "Group 3" is shown

### Requirement: Sort lists
The user SHALL be able to sort the drone list, the student group list, the active loans and the loan history by a column by choosing its header. Choosing the same header again SHALL reverse the order. Names SHALL be sorted ignoring upper and lower case, dates by time (REQ-020).

#### Scenario: Sort by name
- **GIVEN** the drones "TELLO-08" and "mavic-02" exist
- **WHEN** the user sorts the drones by name
- **THEN** "mavic-02" is shown before "TELLO-08"

#### Scenario: Reverse the order
- **GIVEN** the drones are sorted by name
- **WHEN** the user chooses the name header again
- **THEN** "TELLO-08" is shown before "mavic-02"

#### Scenario: Sort the history by return date
- **GIVEN** returned loans with the return dates 10.09.2026 and 20.08.2026
- **WHEN** the user sorts the history by return date in ascending order
- **THEN** the loan returned on 20.08.2026 is shown first
