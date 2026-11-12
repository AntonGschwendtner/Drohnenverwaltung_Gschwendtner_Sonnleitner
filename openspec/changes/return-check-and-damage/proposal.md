# Proposal

## Why

A return today only records the date. If a group brings back 3 of 4 batteries or a broken drone, nobody notices until the next group complains. The team wants to check the accessories on return and to take damaged drones out of lending.

## What Changes

- On return, the returned quantity of batteries and propellers can be entered. It defaults to the loaned quantity. Missing parts are stored and shown in the history (REQ-023).
- A drone can be reported as damaged with a short description, during a return or at any other time. A damaged drone has the new status **Defective** and cannot be loaned (REQ-024).
- A defective drone can be marked as repaired and becomes available again.
- **BREAKING (domain rule):** drone status is no longer only Available or Loaned; it can also be Defective, and that state is entered by a user.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `drone`: status Defective, report damage, mark as repaired.
- `loan`: return with returned quantities and an optional damage report; missing parts in the history.

## Impact

- Backend: `LoanItem` gets `ReturnedQuantity`; `Drone` gets `DefectNote`. One migration. `POST /api/loans/{id}/return` accepts an optional body; new `POST /api/drones/{id}/defect` and `POST /api/drones/{id}/repair`. `DroneStatus` gets `Defective`.
- Frontend: a return dialog with quantities and a damage field, a Defective badge, report and repair actions on the drone page.
- Docs: REQ-023 and REQ-024, domain model and domain rules, `openspec/config.yaml` context, Out of Scope list.

## Out of Scope

- Charging a group for missing parts.
- A repair history with several defects per drone.
- Individual batteries (still out of scope).

## Open Point for the Team

`docs/requirements.md` lists "Schadensverwaltung und Rückgabedifferenzen" as out of scope. This change moves both into scope. The team (and Herr Falkensteiner) decides in the spec review.

## Dependencies

- If `improve-lending-overview` is implemented first, its return confirmation (REQ-013) becomes the return dialog of this change, and its status overview (REQ-014) counts defective drones separately.
