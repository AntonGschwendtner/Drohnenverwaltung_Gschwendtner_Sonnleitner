# Design

## Context

Drones and student groups are created with `POST` and listed with `GET`. Names have a unique index. Loans reference drones and groups by id; the history reads the names through these references.

## Goals / Non-Goals

**Goals:**
- Reuse the validation of the create endpoints for editing.
- Make deleting impossible as soon as the history would lose a row.

**Non-Goals:**
- Soft delete or archive flags.

## Decisions

1. **`PUT` with the full record.** `PUT /api/drones/{id}` takes name and description, `PUT /api/student-groups/{id}` takes the name. Responses: 200 with the record, 400 for invalid input, 404 for an unknown id, 409 for a duplicate name. Alternative `PATCH` - rejected, the records have only one or two fields.
2. **Delete only without loans.** `DELETE` answers 204, 404 or 409 when any loan references the record. The foreign keys keep `Restrict`, so the database refuses as a second line of defense. Alternative: cascade or soft delete - rejected, REQ-010 forbids losing history and soft delete adds a state nobody asked for.
3. **Shared validation.** The name checks move into one method per service and are used by create and edit, so the messages (English and German) stay the same.
4. **Frontend.** Each strip gets Edit and Delete actions. Editing opens the strip as an inline form; deleting asks for confirmation. The Delete action stays visible; a 409 shows the backend message.

## Risks / Trade-offs

- [A renamed drone changes the name in old history rows] → Open point in proposal.md.
- [Two users edit the same record] → Last write wins; acceptable for one cabinet.
