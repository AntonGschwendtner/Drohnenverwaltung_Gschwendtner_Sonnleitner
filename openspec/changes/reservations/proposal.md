# Proposal

## Why

Groups that need a drone for a lesson or a project day cannot rely on it being there: whoever comes first takes it. The team wants to reserve a drone for a group on a given day.

## What Changes

- New domain concept **Reservation**: a drone reserved for a student group on one day (REQ-027).
- Reservations for today or a later day can be created; a drone has at most one reservation per day.
- Upcoming reservations are listed on a new page and can be cancelled (REQ-028).
- On the reserved day only the reserving group can loan the drone. The drone list and the loan form show reservations (REQ-029).
- **BREAKING (domain rule):** "Only available drones can be loaned" gets a second condition: on a reserved day, only by the reserving group.

## Capabilities

### New Capabilities

- `reservation`: reserving a drone for a student group on a day, listing and cancelling reservations.

### Modified Capabilities

- `loan`: loans respect the reservation of the day.

## Impact

- Backend: new entity `Reservation` (`Id`, `DroneId`, `StudentGroupId`, `Date`), unique index on (`DroneId`, `Date`), one migration. Endpoints `GET/POST /api/reservations`, `DELETE /api/reservations/{id}`. The loan check reads the reservation of today.
- Frontend: new page "Reservations" (bay 05) with form and list, reservation hints in the drone list and the loan form.
- Docs: REQ-027 to REQ-029, ubiquitous language and domain model, domain rules in `openspec/config.yaml`, Out of Scope list.

## Out of Scope

- Reservations over several days or for hours of a day.
- Reserving accessories.
- Notifications when a reservation cannot be served.
- Keeping cancelled or past reservations as history.

## Open Points for the Team

- `docs/requirements.md` lists "Reservierungen im Voraus" as out of scope. This change moves it into scope.
- Should a group be allowed to reserve a drone that is loaned right now (this proposal: yes, with a warning)?
- Should a defective drone (from `return-check-and-damage`) be reservable (this proposal: no, if that change is implemented)?
- Deleting a drone or student group (from `manage-drones-and-groups`) that still has upcoming reservations: reject the deletion (this proposal) or delete the reservations with it?
