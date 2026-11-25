## Purpose

Shows how drones are used over a period: totals of all loans, and the number of loans and loan days per drone and per student group, computed from the stored loans.

## ADDED Requirements

### Requirement: Statistics period
The statistics SHALL cover the loans whose loan date lies in the chosen period, including the first and the last day (REQ-030). The periods SHALL be this school year (from 1 September), the last 30 days including today, and all time. The default SHALL be this school year. A period whose start lies after its end SHALL be rejected.

#### Scenario: Loan outside the period
- **GIVEN** today is 10.10.2026
- **AND** a loan has the loan date 20.06.2026 and another the loan date 15.09.2026
- **WHEN** the statistics of this school year are shown
- **THEN** only the loan of 15.09.2026 is counted

#### Scenario: Invalid period
- **GIVEN** the system is running
- **WHEN** statistics from 10.10.2026 to 01.10.2026 are requested
- **THEN** the request is rejected

### Requirement: Loan totals
The statistics SHALL show the number of loans in the period, the number of these loans that are still active, and the average loan duration of the returned loans in full days, rounded to one decimal (REQ-030). Without returned loans the average SHALL be shown as not available.

#### Scenario: Totals
- **GIVEN** three loans in the period: two returned after 2 and 5 days, one still active
- **WHEN** the statistics are shown
- **THEN** they show 3 loans, 1 active and an average duration of 3.5 days

#### Scenario: No returned loan
- **GIVEN** the only loan in the period is active
- **WHEN** the statistics are shown
- **THEN** the average duration is shown as not available

### Requirement: Usage per drone and per student group
The statistics SHALL list every drone with its number of loans and its loan days in the period, the most loaned first, ties ordered by loan days and then by name (REQ-030). Loan days SHALL be counted in full days from the loan date to the return date, or to today for an active loan. The same figures SHALL be listed per student group. Drones and groups without loans in the period SHALL be listed with zero.

#### Scenario: Most used drone first
- **GIVEN** "TELLO-07" was loaned three times and "TELLO-08" once in the period
- **WHEN** the statistics are shown
- **THEN** "TELLO-07" is listed before "TELLO-08" with 3 loans

#### Scenario: Unused drone
- **GIVEN** "TELLO-09" was not loaned in the period
- **WHEN** the statistics are shown
- **THEN** "TELLO-09" is listed with 0 loans and 0 days

#### Scenario: Active loan counts until today
- **GIVEN** today is 25.08.2026
- **AND** "TELLO-07" was loaned to "Group 3" on 19.08.2026 and is still active
- **WHEN** the statistics are shown
- **THEN** "TELLO-07" and "Group 3" each have 6 loan days
