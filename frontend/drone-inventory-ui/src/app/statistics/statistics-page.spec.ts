import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Statistics } from '../api.service';
import { StatisticsPage } from './statistics-page';

/** The statistics page (REQ-030): it shows what the backend computed. */
describe('StatisticsPage', () => {
  let fixture: ComponentFixture<StatisticsPage>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const statistics: Statistics = {
    from: '2025-09-01',
    to: '2026-08-19',
    loanCount: 4,
    activeCount: 1,
    averageDays: 3.5,
    drones: [
      { id: 7, name: 'TELLO-07', loanCount: 3, loanDays: 9 },
      { id: 9, name: 'TELLO-09', loanCount: 0, loanDays: 0 },
    ],
    studentGroups: [{ id: 3, name: 'Group 3', loanCount: 4, loanDays: 12 }],
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [StatisticsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StatisticsPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function tile(label: string): string {
    const match = Array.from(element.querySelectorAll('.overview-tile')).find((t) => t.querySelector('dt')?.textContent?.trim() === label);
    return match?.querySelector('dd')?.textContent?.trim() ?? '';
  }

  it('loads this school year and shows the totals', async () => {
    http.expectOne('/api/statistics').flush(statistics);
    await settle();

    expect(element.querySelector('.statistics-range')?.textContent).toContain('01.09.2025');
    expect(tile('Loans')).toBe('4');
    expect(tile('Still active')).toBe('1');
    expect(tile('Average days')).toBe('3.5');
  });

  it('shows bars and numbers that match the response', async () => {
    http.expectOne('/api/statistics').flush(statistics);
    await settle();

    const rows = Array.from(element.querySelectorAll('section[aria-labelledby="usage-drones"] .usage-row'));
    expect(rows.map((row) => row.querySelector('.usage-name')?.textContent?.trim())).toEqual(['TELLO-07', 'TELLO-09']);
    expect(rows[0].querySelector('.usage-numbers')?.textContent?.trim()).toBe('3 loans · 9 days');
    expect((rows[0].querySelector('.usage-bar span') as HTMLElement).style.width).toBe('100%');
    expect((rows[1].querySelector('.usage-bar span') as HTMLElement).style.width).toBe('0%');
  });

  it('says when no average is available', async () => {
    http.expectOne('/api/statistics').flush({ ...statistics, averageDays: null });
    await settle();

    expect(tile('Average days')).toBe('n/a');
  });

  it('switches the period', async () => {
    http.expectOne('/api/statistics').flush(statistics);
    await settle();

    const buttons = Array.from(element.querySelectorAll('.period-switch button')) as HTMLButtonElement[];
    buttons[1].click();
    await settle();
    const last30 = http.expectOne((request) => request.url === '/api/statistics' && request.params.has('from') && request.params.has('to'));
    last30.flush({ ...statistics, loanCount: 1 });
    await settle();
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(tile('Loans')).toBe('1');

    buttons[2].click();
    await settle();
    expect(http.expectOne((request) => request.url === '/api/statistics').request.params.get('from')).toBe('2000-01-01');
  });

  it('shows the message of the backend', async () => {
    http.expectOne('/api/statistics').flush({ detail: 'The start of the period lies after its end.' }, { status: 400, statusText: 'Bad Request' });
    await settle();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('lies after its end');
  });
});
