# Tasks

## 1. Data (REQ-021, REQ-022)

- [ ] 1.1 Add `Note` and `DueDate` to `Loan` with a migration; entity test that both are optional

## 2. Backend (REQ-021, REQ-022)

- [ ] 2.1 Accept and validate `note` on create, return it in the loan response; tests for "Loan with a note", "Loan without a note", "Note too long"
- [ ] 2.2 Accept and validate `dueDate`, compute `isOverdue`; tests for "Loan with a planned return date", "Planned return date in the past", "Return on the planned day", "Overdue loan", "Returned late"

## 3. Frontend (REQ-021, REQ-022)

- [ ] 3.1 Note and planned return date in the loan form, English and German; component test that both are sent
- [ ] 3.2 Show note, planned return date and the overdue mark in the active loans and the history; component tests for an overdue and a normal loan

## 4. Documentation

- [ ] 4.1 Domain model and README
