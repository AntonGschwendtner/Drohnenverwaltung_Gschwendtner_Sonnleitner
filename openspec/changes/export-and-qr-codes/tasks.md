# Tasks

## 1. Export (REQ-025)

- [ ] 1.1 `GET /api/loans/export` as CSV; tests for "Export the history", "Export without returned loans", "Value with a separator" and the German header
- [ ] 1.2 Export button on the history page; component test that it links to the export

## 2. Print (REQ-025)

- [ ] 2.1 Print stylesheet and print button for the history; test that the button calls print, screenshot check of the print preview for "Print the history"

## 3. QR code (REQ-026)

- [ ] 3.1 Add the pinned QR package, QR code and label print on the drone detail page; component tests for "Show the QR code" and "Print a label"
- [ ] 3.2 Loan page reads `?drone=`; component tests for "Available drone from a QR code" and "Loaned drone from a QR code"

## 4. Documentation

- [ ] 4.1 README (export, print, labels), Out of Scope in `docs/requirements.md`
