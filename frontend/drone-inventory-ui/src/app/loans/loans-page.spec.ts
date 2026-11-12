import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoansPage } from './loans-page';

describe('LoansPage loan form', () => {
  let fixture: ComponentFixture<LoansPage>;
  let http: HttpTestingController;

  const drones = [
    { id: 7, name: 'TELLO-07', status: 'Available', description: '' },
    { id: 8, name: 'TELLO-08', status: 'Loaned', description: '' },
  ];
  const studentGroups = [{ id: 3, name: 'Group 3' }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoansPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoansPage);
    fixture.detectChanges();
    respondToChoices();
    respondToActiveLoans();
    await settle();
  });

  afterEach(() => http.verify());

  function respondToChoices(): void {
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush(drones);
    http.expectOne({ method: 'GET', url: '/api/student-groups' }).flush(studentGroups);
  }

  function respondToActiveLoans(): void {
    http.expectOne({ method: 'GET', url: '/api/loans?status=Active' }).flush([]);
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function choose(name: string, optionText: string): void {
    const select = element().querySelector(`select[name="${name}"]`) as HTMLSelectElement;
    const index = Array.from(select.options).findIndex((option) => option.textContent?.includes(optionText));
    expect(index).toBeGreaterThan(0);
    select.selectedIndex = index;
    select.dispatchEvent(new Event('change'));
  }

  function enter(name: string, value: string): void {
    const field = element().querySelector(`input[name="${name}"]`) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    (element().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();
  }

  it('offers the drones with their status and the student groups', () => {
    const droneOptions = Array.from(element().querySelectorAll('select[name="droneId"] option')).map(
      (option) => option.textContent?.trim(),
    );
    const groupOptions = Array.from(element().querySelectorAll('select[name="studentGroupId"] option')).map(
      (option) => option.textContent?.trim(),
    );

    expect(droneOptions).toEqual(['Choose a drone', 'TELLO-07 (Available)', 'TELLO-08 (Loaned)']);
    expect(groupOptions).toEqual(['Choose a student group', 'Group 3']);
  });

  it('sends the loan with batteries and propellers', async () => {
    choose('droneId', 'TELLO-07');
    choose('studentGroupId', 'Group 3');
    enter('batteries', '4');
    enter('propellers', '8');

    await submit();

    const request = http.expectOne({ method: 'POST', url: '/api/loans' });
    expect(request.request.body).toEqual({
      droneId: 7,
      studentGroupId: 3,
      items: [
        { type: 'Battery', quantity: 4 },
        { type: 'Propeller', quantity: 8 },
      ],
    });
    request.flush({
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
    });
    await settle();
    respondToChoices();
    respondToActiveLoans();
    await settle();

    expect(element().querySelector('[role="status"]')?.textContent).toContain('TELLO-07 is loaned to Group 3.');
    expect((element().querySelector('input[name="batteries"]') as HTMLInputElement).value).toBe('0');
  });

  it('shows the message when the drone is already loaned', async () => {
    choose('droneId', 'TELLO-08');
    choose('studentGroupId', 'Group 3');

    await submit();

    http.expectOne({ method: 'POST', url: '/api/loans' }).flush(
      { detail: 'The drone "TELLO-08" is already loaned.' },
      { status: 409, statusText: 'Conflict' },
    );
    await settle();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain(
      'The drone "TELLO-08" is already loaned.',
    );
    expect((element().querySelector('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('leaves the check of the quantities to the backend', async () => {
    choose('droneId', 'TELLO-07');
    choose('studentGroupId', 'Group 3');
    enter('batteries', '-1');

    await submit();

    const request = http.expectOne({ method: 'POST', url: '/api/loans' });
    expect(request.request.body.items[0]).toEqual({ type: 'Battery', quantity: -1 });
    request.flush(
      { detail: 'Accessory quantities must not be negative.' },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain(
      'Accessory quantities must not be negative.',
    );
  });

  it('sends a loan without a chosen drone to the backend', async () => {
    await submit();

    const request = http.expectOne({ method: 'POST', url: '/api/loans' });
    expect(request.request.body.droneId).toBeNull();
    request.flush({ detail: 'A loan needs a drone.' }, { status: 400, statusText: 'Bad Request' });
    await settle();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain('A loan needs a drone.');
  });
});
