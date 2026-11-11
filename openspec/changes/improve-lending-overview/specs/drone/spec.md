## ADDED Requirements

### Requirement: Search and filter drones
The drone list SHALL be narrowed by a name search and by a status filter (REQ-011). The name search SHALL ignore upper and lower case and match parts of the name. Both conditions SHALL apply together. When no drone matches, the list SHALL say so.

#### Scenario: Search by part of the name
- **GIVEN** the drones "TELLO-07" and "MAVIC-02" exist
- **WHEN** the user searches for "tello"
- **THEN** only "TELLO-07" is shown

#### Scenario: Filter by status
- **GIVEN** "TELLO-07" is Loaned and "MAVIC-02" is Available
- **WHEN** the user filters by Available
- **THEN** only "MAVIC-02" is shown

#### Scenario: No drone matches
- **GIVEN** the drone "TELLO-07" exists
- **WHEN** the user searches for "xyz"
- **THEN** the list shows that no drone matches the search

### Requirement: Drone status overview
The drone page SHALL show the number of all drones, of available drones and of loaned drones (REQ-014). The numbers SHALL count all drones, independent of the search and the filter.

#### Scenario: Overview after a loan
- **GIVEN** three drones exist and one of them is loaned
- **WHEN** the drone page is shown
- **THEN** the overview shows 3 drones, 2 available and 1 loaned

#### Scenario: Overview ignores the search
- **GIVEN** three drones exist
- **WHEN** the user searches for a name that matches one drone
- **THEN** the overview still shows 3 drones
