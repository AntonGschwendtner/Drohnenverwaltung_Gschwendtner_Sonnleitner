## MODIFIED Requirements

### Requirement: Return loan
An active loan SHALL be able to be returned. The return SHALL change the loan from Active to Returned (REQ-008). The drone SHALL become available again, unless a defect is reported with the return; then the drone SHALL become Defective (REQ-024).

#### Scenario: Return a loan
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the loan is returned
- **THEN** the loan is marked as returned
- **AND** "TELLO-07" becomes available again

#### Scenario: Return with a defect
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the loan is returned with the defect "Propeller gebrochen"
- **THEN** the loan is marked as returned
- **AND** "TELLO-07" is Defective

#### Scenario: Loan is already returned
- **GIVEN** a loan has been returned
- **WHEN** the loan is returned again
- **THEN** the return is rejected
- **AND** the return date stays unchanged

#### Scenario: Unknown loan
- **GIVEN** no loan with the given identity exists
- **WHEN** the loan is returned
- **THEN** the return is rejected

## ADDED Requirements

### Requirement: Check accessories on return
A return SHALL accept the returned quantity of each loaned accessory type (REQ-023). Without a returned quantity, the loaned quantity SHALL be assumed. A returned quantity SHALL be a whole number from 0 up to the loaned quantity. The history SHALL show the missing quantity of each type.

#### Scenario: Everything returned
- **GIVEN** "TELLO-07" was loaned with 4 batteries and 8 propellers
- **WHEN** the loan is returned without quantities
- **THEN** the history shows no missing parts

#### Scenario: Battery missing
- **GIVEN** "TELLO-07" was loaned with 4 batteries and 8 propellers
- **WHEN** the loan is returned with 3 batteries and 8 propellers
- **THEN** the history shows 1 missing battery

#### Scenario: More returned than loaned
- **GIVEN** "TELLO-07" was loaned with 4 batteries
- **WHEN** the loan is returned with 5 batteries
- **THEN** the return is rejected
- **AND** the loan stays active

#### Scenario: Negative quantity
- **GIVEN** "TELLO-07" was loaned with 4 batteries
- **WHEN** the loan is returned with -1 batteries
- **THEN** the return is rejected
