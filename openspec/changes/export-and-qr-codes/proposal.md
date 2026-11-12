# Proposal

## Why

The teacher wants to hand in or file the loan history, which today only exists on screen. At the cabinet, finding the right drone in the loan form takes time; a QR code on the drone case could open the loan form with this drone already chosen.

## What Changes

- The loan history can be downloaded as a CSV file that opens in Excel (REQ-025).
- The loan history has a print layout, so the browser can print it or save it as PDF (REQ-025).
- Every drone has a QR code on its detail page, printable as a label. Scanning it opens the loan page with this drone chosen (REQ-026).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `loan`: export of the history, print layout, loan page opened for one drone.
- `drone`: QR code of a drone.

## Impact

- Backend: `GET /api/loans/export` returns `text/csv`. No database change.
- Frontend: export and print buttons on the history page, print stylesheet, QR code on the drone detail page, `/loans?drone=<id>` preselects the drone.
- New frontend dependency for drawing QR codes (exact version pinned, see design.md).
- Docs: REQ-025 and REQ-026, README, Out of Scope list.

## Out of Scope

- Exporting other lists (drones, groups) and Excel files (`.xlsx`).
- A PDF generated on the server.
- Scanning QR codes inside the app (the phone camera opens the link).

## Open Point for the Team

`docs/requirements.md` lists "Exporte" as out of scope. This change moves the history export into scope.

## Dependencies

- Needs the drone detail page from `drone-and-group-details`.
- The QR code contains the address of the app. It only works on phones that can reach that address (school network).
