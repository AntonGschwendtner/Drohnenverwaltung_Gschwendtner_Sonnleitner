import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Loan } from '../api.service';
import { I18nService } from '../i18n.service';
import { LoansPage } from './loans-page';

/** The return dialog with quantities and damage (REQ-013, REQ-023, REQ-024). */
describe('LoansPage return dialog', () => {
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
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoansPage);
    fixture.detectChanges();
    http.expectOne('/api/drones').flush([]);
    http.expectOne('/api/student-groups').flush([]);
    http.expectOne('/api/loans?status=Active').flush([loan]);
    await settle();
  });

  afterEach(() => http.verify());

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function field(name: string): HTMLInputElement {
    return element().querySelector(`[role="alertdialog"] [name="${name}"]`) as HTMLInputElement;
  }

  async function openDialog(): Promise<void> {
    (element().querySelector('section[aria-labelledby="active-loans"] tbody button') as HTMLButtonElement).click();
    await settle();
  }

  async function type(name: string, value: string): Promise<void> {
    field(name).value = value;
    field(name).dispatchEvent(new Event('input'));
    await settle();
  }

  async function confirm(): Promise<void> {
    (element().querySelector('.dialog-confirm') as HTMLButtonElement).click();
    await settle();
  }

  function finishReturn(): void {
    http.expectOne('/api/loans?status=Active').flush([]);
    http.expectOne('/api/drones').flush([]);
    http.expectOne('/api/student-groups').flush([]);
  }

  it('Dialog suggests the loaned quantities', async () => {
    await openDialog();

    expect(field('returnedBatteries').value).toBe('4');
    expect(field('returnedPropellers').value).toBe('8');
    expect(field('defect').value).toBe('');
  });

  it('sends a full return with the loaned quantities and no defect', async () => {
    await openDialog();
    await confirm();

    const request = http.expectOne({ method: 'POST', url: '/api/loans/1/return' });
    expect(request.request.body).toEqual({
      items: [
        { type: 'Battery', returnedQuantity: 4 },
        { type: 'Propeller', returnedQuantity: 8 },
      ],
      defect: null,
    });
    request.flush({ ...loan, status: 'Returned' });
    await settle();
    finishReturn();
  });

  it('sends a missing battery', async () => {
    await openDialog();
    await type('returnedBatteries', '3');
    await confirm();

    const request = http.expectOne({ method: 'POST', url: '/api/loans/1/return' });
    expect(request.request.body.items[0]).toEqual({ type: 'Battery', returnedQuantity: 3 });
    request.flush({ ...loan, status: 'Returned', missingBatteries: 1 });
    await settle();
    finishReturn();
  });

  it('sends a defect with the return', async () => {
    await openDialog();
    await type('defect', 'Propeller gebrochen');
    await confirm();

    const request = http.expectOne({ method: 'POST', url: '/api/loans/1/return' });
    expect(request.request.body.defect).toBe('Propeller gebrochen');
    request.flush({ ...loan, status: 'Returned' });
    await settle();
    finishReturn();
  });

  it('shows the message of the backend for a wrong quantity and keeps the loan', async () => {
    await openDialog();
    await type('returnedBatteries', '9');
    await confirm();

    http
      .expectOne({ method: 'POST', url: '/api/loans/1/return' })
      .flush({ detail: 'More Battery returned than loaned (4).' }, { status: 400, statusText: 'Bad Request' });
    await settle();
    http.expectOne('/api/loans?status=Active').flush([loan]);
    await settle();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain('More Battery returned than loaned (4).');
  });

  it('moves through the fields with Tab and stays in the dialog', async () => {
    await openDialog();
    const cancel = element().querySelector('.dialog-cancel') as HTMLButtonElement;
    cancel.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(document.activeElement?.classList.contains('dialog-confirm')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(document.activeElement).toBe(field('returnedBatteries'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
    expect(document.activeElement?.classList.contains('dialog-confirm')).toBe(true);

    cancel.click();
    await settle();
  });

  it('labels the fields in German', async () => {
    TestBed.inject(I18nService).language.set('de');
    await openDialog();

    expect(element().querySelector('[role="alertdialog"]')?.textContent).toContain('Akkus zurück');
    expect(element().querySelector('[role="alertdialog"]')?.textContent).toContain('Schaden (optional)');
    (element().querySelector('.dialog-cancel') as HTMLButtonElement).click();
    await settle();
  });
});
