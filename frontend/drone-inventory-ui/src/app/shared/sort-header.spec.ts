import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Loan } from '../api.service';
import { DronesPage } from '../drones/drones-page';
import { HistoryPage } from '../history/history-page';
import { LoansPage } from '../loans/loans-page';
import { StudentGroupsPage } from '../student-groups/student-groups-page';

/** Scenarios of the requirement "Sort lists" (REQ-020). */
describe('Sortable lists', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  const loan: Loan = {
    id: 1,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 4,
    propellers: 8,
    loanDate: '2026-08-01',
    returnDate: '2026-09-10',
    status: 'Returned',
  };

  function firstColumn(element: HTMLElement): string[] {
    return Array.from(element.querySelectorAll('tbody tr td:first-child')).map((cell) => cell.textContent?.trim() ?? '');
  }

  function header(element: HTMLElement, label: string): HTMLTableCellElement {
    return Array.from(element.querySelectorAll<HTMLTableCellElement>('thead th')).find((cell) =>
      cell.textContent?.includes(label),
    ) as HTMLTableCellElement;
  }

  async function click(fixture: { whenStable(): Promise<unknown>; detectChanges(): void }, cell: HTMLElement): Promise<void> {
    (cell.querySelector('button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('Sort by name and Reverse the order', async () => {
    const fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/drones')
      .flush([
        { id: 8, name: 'TELLO-08', status: 'Available', description: '' },
        { id: 2, name: 'mavic-02', status: 'Available', description: '' },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const name = header(element, 'Name');

    expect(firstColumn(element)).toEqual(['TELLO-08', 'mavic-02']);
    expect(name.getAttribute('aria-sort')).toBe('none');

    await click(fixture, name);
    expect(firstColumn(element)).toEqual(['mavic-02', 'TELLO-08']);
    expect(name.getAttribute('aria-sort')).toBe('ascending');

    await click(fixture, name);
    expect(firstColumn(element)).toEqual(['TELLO-08', 'mavic-02']);
    expect(name.getAttribute('aria-sort')).toBe('descending');
  });

  it('Sort the history by return date', async () => {
    const fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/loans?status=Returned')
      .flush([loan, { ...loan, id: 2, studentGroupId: 4, studentGroupName: 'Group 4', returnDate: '2026-08-20' }]);
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    await click(fixture, header(element, 'Return date'));

    expect(firstColumn(element)).toEqual(['Group 4', 'Group 3']);
  });

  it('sorts the active loans by duration and moves the mark to the chosen header', async () => {
    const fixture = TestBed.createComponent(LoansPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/drones').flush([]);
    http.expectOne('/api/student-groups').flush([]);
    http.expectOne('/api/loans?status=Active').flush([
      { ...loan, status: 'Active', returnDate: null, daysActive: 2 },
      { ...loan, id: 2, studentGroupName: 'Group 4', status: 'Active', returnDate: null, daysActive: 9, isLongRunning: true },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const duration = header(element, 'On loan');

    await click(fixture, duration);
    await click(fixture, duration);

    expect(firstColumn(element)).toEqual(['Group 4', 'Group 3']);
    expect(duration.getAttribute('aria-sort')).toBe('descending');
    expect(header(element, 'Drone').getAttribute('aria-sort')).toBe('none');
  });

  it('sorts student groups with numbers in their names naturally', async () => {
    const fixture = TestBed.createComponent(StudentGroupsPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/student-groups')
      .flush([
        { id: 10, name: 'Group 10', members: [], leaderName: null },
        { id: 9, name: 'Group 9', members: [], leaderName: null },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    await click(fixture, header(element, 'Name'));

    expect(firstColumn(element)).toEqual(['Group 9', 'Group 10']);
  });
});
