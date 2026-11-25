# Design

## Context

The history page loads `GET /api/loans?status=Returned`. The frontend has no print styles yet. The drone detail page comes from `drone-and-group-details`.

## Goals / Non-Goals

**Goals:**
- An export that a teacher can open in Excel with a double click.

**Non-Goals:**
- Server-side PDF generation.

## Decisions

1. **CSV from the backend.** `GET /api/loans/export` writes the returned loans in history order: UTF-8 with BOM, `;` as separator and `dd.MM.yyyy` dates, so German Excel opens it correctly; values with `;`, `"` or line breaks are quoted. `Content-Disposition: attachment; filename="loan-history-<date>.csv"`. Header names follow the request language. Alternative: build the CSV in the browser - rejected, the format is a business rule and belongs in the backend.
2. **PDF through the browser.** A `@media print` stylesheet hides header, ticker, footer, buttons and effects and prints the strips as a plain table. Alternative: a PDF library in the backend - rejected, the browser already saves as PDF.
3. **QR code in the browser.** The npm package `qrcode` (exact version pinned) draws an SVG. Content: `<origin>/loans?drone=<id>`. Alternative: a QR endpoint in the backend - more code for the same result.
4. **Preselect.** The loan page reads the `drone` query parameter after loading the drones and sets the form value only if the drone is Available; otherwise it shows a hint with the group of the active loan.

## Risks / Trade-offs

- [New dependency] → Small, widely used, version pinned; reviewed in the task.
- [QR codes point to one host] → Printed labels must be renewed when the address changes; noted in the README.
