import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Loan } from '../api.service';
import { HistoryPage } from './history-page';

/** Scenario "Print the history" (REQ-025). */
describe('HistoryPage print', () => {
  let fixture: ComponentFixture<HistoryPage>;

  const loan: Loan = {
    id: 1,
    droneId: 7,
    droneName: 'TELLO-07',
    studentGroupId: 3,
    studentGroupName: 'Group 3',
    batteries: 4,
    propellers: 8,
    loanDate: '2026-08-19',
    returnDate: '2026-08-26',
    status: 'Returned',
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/loans?status=Returned').flush([loan]);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it('opens the print dialog of the browser', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    ((fixture.nativeElement as HTMLElement).querySelector('button.print-button') as HTMLButtonElement).click();

    expect(print).toHaveBeenCalledTimes(1);
  });

  it('has the print date for the paper', () => {
    const today = new Date();
    const expected = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;

    expect((fixture.nativeElement as HTMLElement).querySelector('.print-only.print-date')?.textContent?.trim()).toBe(
      `Printed on ${expected}`,
    );
  });
});
