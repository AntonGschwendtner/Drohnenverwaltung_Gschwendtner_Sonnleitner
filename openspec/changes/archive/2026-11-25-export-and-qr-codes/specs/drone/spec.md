## ADDED Requirements

### Requirement: Drone QR code
The detail page of a drone SHALL show a QR code with the address of the loan page for this drone, together with the drone name, and SHALL offer to print it as a label (REQ-026).

#### Scenario: Show the QR code
- **GIVEN** the drone "TELLO-07" exists
- **WHEN** the details of "TELLO-07" are shown
- **THEN** a QR code with the address of the loan page for "TELLO-07" is shown with the name "TELLO-07"

#### Scenario: Print a label
- **GIVEN** the details of "TELLO-07" are shown
- **WHEN** the user prints the label
- **THEN** the printout contains only the QR code and the name "TELLO-07"
