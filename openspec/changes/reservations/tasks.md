# Tasks

## 1. Backend (REQ-027 to REQ-029)

- [x] 1.1 Entity `Reservation` with unique index on drone and day and cascade, migration; `POST`, `GET`, `DELETE /api/reservations`; loan check against today's reservation, `reservedTodayFor` and `nextReservation` in the drone list; trash refuses reserved drones and groups; tests for every scenario of the reservation and loan deltas (#232)

## 2. Frontend (REQ-027 to REQ-029)

- [ ] 2.1 Reservations page (Bay 05) with form, list and cancel, English and German; reservation hints in the drone list and the loan form; reserved today on the page "Today"; component tests for creating, listing, cancelling, "Loan before the reserved day" and "Reserved today" (#233)

## 3. Documentation

- [ ] 3.1 Ubiquitous language, domain model, domain rules in `openspec/config.yaml`, `docs/requirements.md`, README (#234)
