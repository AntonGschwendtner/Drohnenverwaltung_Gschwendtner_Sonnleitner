# Design

## Context

See `proposal.md` for the motivation and `specs/` for the required behavior. The repository contains unchanged templates: an ASP.NET Core 10 Web API with a `/weatherforecast` sample in `backend/DroneInventory.Api` and an Angular application in `frontend/drone-inventory-ui`, tested with Vitest through `ng test`. There is no backend test project and no persistence yet. The domain model is in `docs/domain-model.md`.

## Goals / Non-Goals

**Goals:**

- All domain rules are enforced in the backend, so they hold for every API client.
- Every spec scenario is covered by an automated test.
- The application runs locally with two commands and no separate database server.

**Non-Goals:**

- Deployment, hosting or production configuration
- API versioning
- Paging or search in the lists

## Decisions

### Drone status is calculated

The status of a drone is calculated from whether an active loan exists and is not stored on the drone. A stored field would be a second source of truth that can disagree with the loans. A stored status would make lists slightly simpler, but a return would have to update two records.

### A database index guards the single active loan

The loan service checks for an active loan and returns a clear error. A partial unique index on `Loan.DroneId` with the filter `Status = 'Active'` also protects the rule when two requests arrive at the same time. A failed insert caused by the index is reported like the regular double-loan error. A check in code alone would allow a race, and serializable transactions would add more complexity than this application needs.

### Endpoints stay thin, services hold the rules

Minimal API endpoints, as provided by the template, are grouped per capability. They call `DroneService`, `StudentGroupService` and `LoanService`, which are registered through dependency injection and contain the rules. Controllers would add structure the small API does not need.

### REST API

| Method and path | Purpose | Requirement |
|---|---|---|
| `POST /api/drones` | Create drone | REQ-001 |
| `GET /api/drones` | List drones with status | REQ-002 |
| `POST /api/student-groups` | Create student group | REQ-003 |
| `GET /api/student-groups` | List student groups | REQ-003 |
| `POST /api/loans` | Create loan with `droneId`, `studentGroupId` and `items` | REQ-004, REQ-005, REQ-006 |
| `GET /api/loans?status=Active` | List active loans | REQ-007 |
| `POST /api/loans/{id}/return` | Return loan | REQ-008, REQ-009 |
| `GET /api/loans?status=Returned` | List loan history, newest return first | REQ-010 |

No delete endpoint exists for loans, so a delete request ends in 404 or 405 and returned loans cannot be removed.

### Error responses

Rejections use `ProblemDetails` with a readable message:

- `400` for invalid input, including a missing name, a negative or non-whole quantity, an unknown or repeated accessory type, and an unknown drone or student group in the request body
- `404` for an unknown loan in the path
- `409` for a duplicate name, a drone that is already loaned, and a loan that is already returned

The frontend shows the message to the user and does not repeat the rules.

### Persistence

Entity Framework Core with the SQLite provider stores data in a local file that is ignored by Git. Schema changes use migrations, which are applied at startup. `Status` and `Type` are stored as strings so the database stays readable. Name uniqueness is enforced by unique indexes. `LoanDate` and `ReturnDate` are stored as dates. Services read the date through `TimeProvider`, so tests can use a fixed date such as 19.08.2026.

### Frontend connection

The Angular development server forwards `/api` to the backend through a proxy configuration. This avoids CORS configuration for a backend that has no production deployment. Each view is a standalone component that uses a shared API service. Dates are shown as `dd.MM.yyyy`.

### Test strategy

Backend scenarios are tested through the HTTP API with xUnit and `WebApplicationFactory`, using an isolated SQLite in-memory database per test. This also tests the database index. Frontend tests check that components display data and call the API, using a mocked HTTP backend.

## Risks / Trade-offs

- [The status has to be calculated for every drone in the list] → This is a simple query, and the expected data volume is small.
- [SQLite allows one writer at a time] → This is sufficient for a single class using one local application.
- [Only the backend knows the rules, so the form accepts invalid input until submit] → The server message is shown immediately after submitting.
- [Migrations at startup can fail on an incompatible local database file] → The local file holds no shared data and can be recreated during development.
