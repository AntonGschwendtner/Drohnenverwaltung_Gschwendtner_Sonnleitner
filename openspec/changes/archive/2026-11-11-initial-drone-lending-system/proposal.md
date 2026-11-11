# Proposal

## Why

Drones and accessories are lent to student groups, and today a paper note on the cabinet door is the only record. It cannot reliably show which drones are available, who holds what or which loans happened in the past. This change delivers the first version of a traceable and lasting replacement.

## What Changes

- Create and list drones. The status Available or Loaned follows from the active loan and is never entered.
- Create and list student groups.
- Loan an available drone to a student group, with batteries and propellers as quantities.
- Reject a second active loan for the same drone and invalid accessory quantities.
- List active loans.
- Return a loan, which stores the return date and makes the drone available again.
- Keep returned loans permanently and list them as loan history.

The requirements are REQ-001 to REQ-010 in `docs/requirements.md`. The terms are defined in `docs/domain-model.md`.

### Out of scope

- Login, user accounts and roles
- Individual batteries with their own identity
- Reservations in advance
- Damage management and return differences
- Reports, statistics and exports

These can follow later as separate change requests.

## Capabilities

### New Capabilities

- `drone`: Create and list drones, including the status that follows from the active loan (REQ-001, REQ-002).
- `student-group`: Create and list the student groups that can loan drones (REQ-003).
- `loan`: Loan drones with accessories, list active loans, return loans and keep the loan history (REQ-004 to REQ-010).

### Modified Capabilities

None. `openspec/specs/` is still empty.

## Impact

- `backend/DroneInventory.Api`: replaces the `/weatherforecast` template endpoint with the REST API and adds persistence with Entity Framework Core and SQLite.
- `frontend/drone-inventory-ui`: replaces the template start page with the application views.
- New test project for the backend. Frontend tests are added to the existing setup.
- New dependencies: Entity Framework Core with the SQLite provider, and backend test libraries.
