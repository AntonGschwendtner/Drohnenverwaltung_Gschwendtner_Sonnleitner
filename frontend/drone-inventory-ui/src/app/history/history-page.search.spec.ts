import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Loan } from '../api.service';
import { HistoryPage } from './history-page';

/** Scenarios of the requirement "Search loan history" (REQ-011). */
describe('HistoryPage search', () => {
  let fixture: ComponentFixture<HistoryPage>;
  let element: HTMLElement;

  const loan: Loan = {
    id: 1,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 4,
    propellers: 8,
    loanDate: '2026-08-19',
    returnDate: '2026-08-21',
    status: 'Returned',
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HistoryPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;

    TestBed.inject(HttpTestingController)
      .expectOne('/api/loans?status=Returned')
      .flush([
        loan,
        { ...loan, id: 2, droneId: 8, droneName: 'TELLO-08', studentGroupId: 9, studentGroupName: 'Robotics Club' },
        { ...loan, id: 3, droneId: 9, droneName: 'MAVIC-02', studentGroupId: 9, studentGroupName: 'Robotics Club' },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function shown(): string[] {
    return Array.from(element.querySelectorAll('tbody tr')).map((row) => {
      const cells = row.querySelectorAll('td');
      return `${cells[0].textContent?.trim()} / ${cells[1].textContent?.trim()}`;
    });
  }

  async function search(text: string): Promise<void> {
    const input = element.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('Search by student group', async () => {
    await search('robotics');

    expect(shown()).toEqual(['Robotics Club / TELLO-08', 'Robotics Club / MAVIC-02']);
  });

  it('finds loans by the drone name', async () => {
    await search('tello-07');

    expect(shown()).toEqual(['Group 3 / TELLO-07']);
  });

  it('No loan matches', async () => {
    await search('xyz');

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.empty')?.textContent).toContain('No loan matches the search.');
  });
});
