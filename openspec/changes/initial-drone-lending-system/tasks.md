# Tasks

## 1. Backend foundation

- [x] 1.1 Remove the `/weatherforecast` sample, add EF Core with SQLite, a `DbContext` and migrations applied at startup; ignore the database file in Git; verify the API starts and creates the database file (foundation for all requirements) (#9)
- [x] 1.2 Create the test project `backend/DroneInventory.Api.Tests` with xUnit, `WebApplicationFactory`, isolated in-memory SQLite and a fixed `TimeProvider`; verify a smoke test passes with `dotnet test` (foundation for all requirements) (#10)

## 2. Domain model

- [x] 2.1 Add the `Drone` entity with a unique name index and a migration; verify with a test that a duplicate name is refused by the database (REQ-001) (#11)
- [x] 2.2 Add the `StudentGroup` entity with a unique name index and a migration; verify with a test that a duplicate name is refused by the database (REQ-003) (#12)
- [x] 2.3 Add the `Loan` and `LoanItem` entities with a migration and the partial unique index for active loans; verify with a test that a second active loan for one drone is refused by the database and a returned loan does not block a new one (REQ-005, REQ-006, REQ-010) (#13)

## 3. Drone and student group API

- [x] 3.1 Implement `POST /api/drones`; verify with tests for the scenarios Create a drone, Name is missing and Name already exists (REQ-001) (#14)
- [x] 3.2 Implement `GET /api/drones` with the calculated status; verify with tests for the scenarios Drone without an active loan and Drone with an active loan (REQ-002) (#15)
- [x] 3.3 Implement `POST /api/student-groups`; verify with tests for the scenarios Create a student group, Name is missing and Name already exists (REQ-003) (#16)
- [x] 3.4 Implement `GET /api/student-groups`; verify with a test for the scenario List student groups (REQ-003) (#17)

## 4. Loan API

- [x] 4.1 Implement `POST /api/loans` for an available drone and known group; verify with tests for the scenarios Loan an available drone, Unknown drone, Unknown student group and Active loan has no return date (REQ-004, REQ-009) (#18)
- [x] 4.2 Reject a loan for a drone that is already loaned; verify with tests for the scenarios Drone is already loaned and Two loans at the same time (REQ-005) (#19)
- [x] 4.3 Add accessories and their validation to the loan; verify with tests for the scenarios Loan with accessories, Quantity of zero, Negative quantity, Quantity is not a whole number, Unknown accessory type and Accessory type appears twice (REQ-006) (#20)
- [x] 4.4 Implement `GET /api/loans?status=Active`; verify with tests for the scenarios List active loans and Returned loan is not active (REQ-007) (#21)
- [x] 4.5 Implement `POST /api/loans/{id}/return` and store the return date; verify with tests for the scenarios Return a loan, Loan is already returned, Unknown loan and Return date is stored (REQ-008, REQ-009) (#22)
- [x] 4.6 Implement `GET /api/loans?status=Returned`; verify with tests for the scenarios Returned loan stays in the history, Same drone is loaned again and Loans cannot be deleted (REQ-010) (#23)

## 5. Frontend

- [x] 5.1 Replace the template start page with navigation and routes, add the `/api` proxy and a shared API service; verify with `ng test` that the service calls the expected URLs and that `ng serve` reaches the backend through the proxy (foundation for all views) (#24)
- [x] 5.2 Add the drone list with name, status and description; verify with a component test that Available and Loaned are shown (REQ-002) (#25)
- [x] 5.3 Add the drone form; verify with component tests that a valid drone is sent and that a rejection message from the backend is shown (REQ-001) (#26)
- [x] 5.4 Add the student group view with list and form; verify with component tests that groups are shown, a group is sent and a rejection message is shown (REQ-003) (#27)
- [x] 5.5 Add the loan form with drone, group, batteries and propellers; verify with component tests that the loan is sent with its items and that a rejection message is shown (REQ-004, REQ-005, REQ-006) (#28)
- [x] 5.6 Add the active loan list; verify with a component test that group, drone, batteries, propellers and date in the format `dd.MM.yyyy` are shown (REQ-007) (#29)
- [x] 5.7 Add the return action to the active loan list; verify with a component test that the return is sent and the list is refreshed (REQ-008, REQ-009) (#30)
- [x] 5.8 Add the loan history view; verify with a component test that accessories, loan date and return date are shown (REQ-010) (#31)

## 6. Integration

- [ ] 6.1 Describe how to start and test the application in `README.md`, then walk through the example from `docs/requirements.md` in the running application: create TELLO-07 and Group 3, loan with 4 batteries and 8 propellers, try a second loan, return, check the history; verify that each step behaves as specified and that `dotnet test` and `ng test` pass (all requirements) (#32)

## Workflow follow-up

- Review `proposal.md`, the specs and these tasks before implementation starts.
- Create the GitHub Issues with `/openspec-to-github`.
- Implement one issue per run with `/openspec-apply-with-github`.
- Archive with `/openspec-archive-with-github` after all tasks are implemented, tested and merged.
