import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Loan } from '../api.service';
import { I18nService } from '../i18n.service';
import { HistoryPage } from './history-page';

/** The export of the history (REQ-025). */
describe('HistoryPage export', () => {
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

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function link(): HTMLAnchorElement {
    return (fixture.nativeElement as HTMLElement).querySelector('a.export-link') as HTMLAnchorElement;
  }

  it('links to the CSV export of the backend as a download', () => {
    expect(link().getAttribute('href')).toBe('/api/loans/export?culture=en&ui-culture=en');
    expect(link().hasAttribute('download')).toBe(true);
    expect(link().textContent?.trim()).toBe('Export as CSV');
  });

  it('asks for the German file when the page is German', async () => {
    TestBed.inject(I18nService).language.set('de');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(link().getAttribute('href')).toBe('/api/loans/export?culture=de&ui-culture=de');
    expect(link().textContent?.trim()).toBe('Als CSV exportieren');
  });
});
