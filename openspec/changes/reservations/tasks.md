# Tasks

## 1. Data (REQ-027)

- [ ] 1.1 Entity `Reservation` with unique index on drone and day, migration; entity tests

## 2. Reservation API (REQ-027, REQ-028)

- [ ] 2.1 `POST /api/reservations`; tests for "Reserve a drone", "Day in the past", "Drone already reserved on that day", "Same drone on another day", "Unknown drone or student group", "Two reservations at the same time"
- [ ] 2.2 `GET /api/reservations` and `DELETE /api/reservations/{id}`; tests for "List upcoming reservations", "Cancel a reservation", "Reservation of a loaned drone"

## 3. Loans (REQ-029)

- [ ] 3.1 Loan check against today's reservation and `reservedTodayFor` in the drone list; tests for "Reserving group loans on the reserved day", "Other group on the reserved day", "Loan before the reserved day"

## 4. Frontend

- [ ] 4.1 Reservations page (Bay 05) with form, list and cancel, English and German; component tests for creating, listing and cancelling
- [ ] 4.2 Reservation hints in the drone list and the loan form; component test for "Loan before the reserved day"

## 5. Documentation

- [ ] 5.1 Ubiquitous language, domain model, domain rules in `openspec/config.yaml`, Out of Scope in `docs/requirements.md`, README
