## ADDED Requirements

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
