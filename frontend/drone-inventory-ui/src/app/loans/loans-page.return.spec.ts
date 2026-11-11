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

  function activeDroneNames(): string[] {
    return Array.from(element().querySelectorAll('section[aria-labelledby="active-loans"] tbody tr')).map(
      (row) => row.querySelectorAll('td')[1].textContent?.trim() ?? '',
    );
  }

  it('sends the return and refreshes the list', async () => {
    expect(activeDroneNames()).toEqual(['TELLO-07']);

    returnButton().click();
    await settle();

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
    returnButton().click();
    await settle();

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
    returnButton().click();
    returnButton().click();
    await settle();

    http.expectOne({ method: 'POST', url: '/api/loans/1/return' }).flush({ ...loan, status: 'Returned' });
    await settle();
    http.expectOne('/api/loans?status=Active').flush([]);
    respondToChoices();
    await settle();
  });
});
