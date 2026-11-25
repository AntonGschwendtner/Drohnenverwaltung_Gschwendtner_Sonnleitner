## ADDED Requirements

### Requirement: Due today and days overdue
An active loan whose planned return date is today SHALL be marked as due today (REQ-035). An overdue active loan SHALL show for how many full days it is overdue. The list of active loans SHALL mark loans due today and overdue loans in different colours. Returned loans and loans without a planned return date SHALL have neither mark.

#### Scenario: Due today
- **GIVEN** a loan with the planned return date 26.08.2026 is active
- **WHEN** the active loans are listed on 26.08.2026
- **THEN** the loan is marked as due today and not as overdue

#### Scenario: Overdue for days
- **GIVEN** a loan with the planned return date 26.08.2026 is active
- **WHEN** the active loans are listed on 29.08.2026
- **THEN** the loan is marked as overdue for 3 days

#### Scenario: Overdue for one day
- **GIVEN** a loan with the planned return date 26.08.2026 is active
- **WHEN** the active loans are listed on 27.08.2026
- **THEN** the loan is marked as overdue for 1 day

#### Scenario: Not due yet
- **GIVEN** a loan with the planned return date 26.08.2026 is active
- **WHEN** the active loans are listed on 25.08.2026
- **THEN** the loan is neither due today nor overdue

#### Scenario: Returned or without a planned date
- **GIVEN** a returned loan and an active loan without a planned return date
- **WHEN** the loans are listed
- **THEN** neither loan is marked as due today or overdue
