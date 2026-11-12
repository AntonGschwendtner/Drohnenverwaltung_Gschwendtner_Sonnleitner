import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Loan } from '../api.service';
import { LoansPage } from './loans-page';

describe('LoansPage return', () => {
  let fixture: ComponentFixture<LoansPage>;
  let http: HttpTestingController;

  const loan: Loan = {
    id: 1,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 4,
    propellers: 8,
    loanDate: '2026-08-19',
    returnDate: null,
    status: 'Active',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoansPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoansPage);
    fixture.detectChanges();
    respondToChoices();
    http.expectOne('/api/loans?status=Active').flush([loan]);
    await settle();
  });

  afterEach(() => http.verify());

  function respondToChoices(): void {
    http.expectOne('/api/drones').flush([]);
    http.expectOne('/api/student-groups').flush([]);
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function returnButton(): HTMLButtonElement {
    return element().querySelector('section[aria-labelledby="active-loans"] tbody button') as HTMLButtonElement;
  }

  function dialog(): HTMLElement | null {
    return element().querySelector('[role="alertdialog"]');
  }

  async function chooseReturnAndConfirm(): Promise<void> {
    returnButton().click();
    await settle();
    (dialog()?.querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();
  }

  function activeDroneNames(): string[] {
    return Array.from(element().querySelectorAll('section[aria-labelledby="active-loans"] tbody tr')).map(
      (row) => row.querySelectorAll('td')[1].textContent?.trim() ?? '',
    );
  }

  it('sends the return and refreshes the list', async () => {
    expect(activeDroneNames()).toEqual(['TELLO-07']);

    await chooseReturnAndConfirm();

    const request = http.expectOne({ method: 'POST', url: '/api/loans/1/return' });
    expect(returnButton().disabled).toBe(true);
    request.flush({ ...loan, status: 'Returned', returnDate: '2026-08-21' });
    await settle();

    http.expectOne('/api/loans?status=Active').flush([]);
    respondToChoices();
    await settle();

    expect(activeDroneNames()).toEqual([]);
    expect(element().textContent).toContain('No active loans.');
    expect(element().querySelector('[role="status"]')?.textContent).toContain('TELLO-07 is returned.');
  });

  it('shows the message when the loan is already returned and refreshes the list', async () => {
    await chooseReturnAndConfirm();

    http.expectOne({ method: 'POST', url: '/api/loans/1/return' }).flush(
      { detail: 'The loan with the id 1 is already returned.' },
      { status: 409, statusText: 'Conflict' },
    );
    await settle();

    http.expectOne('/api/loans?status=Active').flush([]);
    await settle();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain(
      'The loan with the id 1 is already returned.',
    );
    expect(activeDroneNames()).toEqual([]);
  });

  it('sends only one return while a request runs', async () => {
    await chooseReturnAndConfirm();
    returnButton().click();
    await settle();
    expect(dialog()).toBeNull();

    http.expectOne({ method: 'POST', url: '/api/loans/1/return' }).flush({ ...loan, status: 'Returned' });
    await settle();
    http.expectOne('/api/loans?status=Active').flush([]);
    respondToChoices();
    await settle();
  });

  describe('confirmation (REQ-013)', () => {
    it('names the drone and the student group before anything is sent', async () => {
      returnButton().click();
      await settle();

      expect(dialog()?.textContent).toContain('Return TELLO-07?');
      expect(dialog()?.textContent).toContain('TELLO-07 comes back from Group 3.');
      expect(document.activeElement?.classList.contains('dialog-cancel')).toBe(true);
      http.expectNone({ method: 'POST', url: '/api/loans/1/return' });
    });

    it('Confirm the return', async () => {
      await chooseReturnAndConfirm();

      expect(dialog()).toBeNull();
      http.expectOne({ method: 'POST', url: '/api/loans/1/return' }).flush({ ...loan, status: 'Returned' });
      await settle();
      http.expectOne('/api/loans?status=Active').flush([]);
      respondToChoices();
      await settle();
    });

    it('Cancel the return', async () => {
      returnButton().click();
      await settle();
      (dialog()?.querySelector('.dialog-cancel') as HTMLButtonElement).click();
      await settle();

      expect(dialog()).toBeNull();
      http.expectNone({ method: 'POST', url: '/api/loans/1/return' });
      expect(activeDroneNames()).toEqual(['TELLO-07']);
      expect(document.activeElement).toBe(returnButton());
    });

    it('cancels with Escape', async () => {
      returnButton().click();
      await settle();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await settle();

      expect(dialog()).toBeNull();
      http.expectNone({ method: 'POST', url: '/api/loans/1/return' });
    });

    it('cancels with a click next to the dialog', async () => {
      returnButton().click();
      await settle();
      (element().querySelector('.dialog-backdrop') as HTMLElement).click();
      await settle();

      expect(dialog()).toBeNull();
      http.expectNone({ method: 'POST', url: '/api/loans/1/return' });
    });

    it('keeps the focus inside the dialog with Tab', async () => {
      returnButton().click();
      await settle();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(document.activeElement?.classList.contains('dialog-confirm')).toBe(true);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
      expect(document.activeElement?.classList.contains('dialog-cancel')).toBe(true);

      (dialog()?.querySelector('.dialog-cancel') as HTMLButtonElement).click();
      await settle();
    });
  });
});
