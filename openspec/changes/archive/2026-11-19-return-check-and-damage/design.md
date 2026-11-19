# Design

## Context

The drone status is computed from the existence of an active loan. The return is a conditional update (`Status == Active`) that sets `Status` and `ReturnDate` in one statement. `LoanItem` stores type and quantity.

## Goals / Non-Goals

**Goals:**
- One request per return, so quantities, defect and status change happen together.

**Non-Goals:**
- A separate defect entity with history.

## Decisions

1. **`DefectNote` on `Drone`.** Status order: `DefectNote != null` → Defective, else active loan → Loaned, else Available. A drone with an active loan cannot get a defect except through the return, so Defective and Loaned never overlap. Alternative: a `Defect` table - rejected for now, see Non-Goals.
2. **`ReturnedQuantity` on `LoanItem`.** Nullable; set on return, defaulting to `Quantity`. Missing = `Quantity - ReturnedQuantity`. Old returned loans get `ReturnedQuantity = Quantity` in the migration, so they show nothing missing.
3. **Return in a transaction.** The return body `{ items: [{ type, returnedQuantity }], defect: string? }` is validated first; then a transaction runs the conditional status update, writes the returned quantities and, if given, the defect note. A concurrent second return still gets 409 from the conditional update.
4. **Loan check.** `CreateAsync` additionally rejects a drone with a `DefectNote` (409, English and German message).
5. **Endpoints.** `POST /api/drones/{id}/defect` with `{ description }` and `POST /api/drones/{id}/repair`; both answer with the drone.

## Risks / Trade-offs

- [The domain rule "availability follows from the active loan" changes] → Updated in `docs/domain-model.md` and `openspec/config.yaml` as part of the tasks; open point in proposal.md.
- [The return endpoint gets a body] → The body is optional, so the current frontend keeps working until it is updated.
