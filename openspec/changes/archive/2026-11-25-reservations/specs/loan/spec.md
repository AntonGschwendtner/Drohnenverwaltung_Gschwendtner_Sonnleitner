## ADDED Requirements

### Requirement: Respect reservations when loaning
On a day for which a drone is reserved, the drone SHALL only be loaned to the reserving student group (REQ-029). On other days reservations SHALL NOT restrict loans. The loan form SHALL show the next reservation of the chosen drone.

#### Scenario: Reserving group loans on the reserved day
- **GIVEN** today is 21.08.2026
- **AND** "TELLO-07" is available and reserved for "Group 3" today
- **WHEN** "TELLO-07" is loaned to "Group 3"
- **THEN** the loan is created

#### Scenario: Other group on the reserved day
- **GIVEN** today is 21.08.2026
- **AND** "TELLO-07" is available and reserved for "Group 3" today
- **WHEN** "TELLO-07" is loaned to "Group 4"
- **THEN** the loan is rejected with the hint that "TELLO-07" is reserved for "Group 3"

#### Scenario: Loan before the reserved day
- **GIVEN** today is 19.08.2026
- **AND** "TELLO-07" is available and reserved for "Group 3" on 21.08.2026
- **WHEN** "TELLO-07" is loaned to "Group 4"
- **THEN** the loan is created
- **AND** the loan form showed the reservation on 21.08.2026 before saving
