import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { DronesPage } from './drones/drones-page';
import { I18nTitleStrategy } from './i18n-title.strategy';
import { I18nService, LANGUAGE_STORAGE_KEY } from './i18n.service';
import { languageInterceptor } from './language.interceptor';
import { LoansPage } from './loans/loans-page';

describe('Language switch', () => {
  beforeEach(() => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([languageInterceptor])), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  });

  it('switches between English and German, remembers the choice and marks the page', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    const i18n = TestBed.inject(I18nService);
    expect(i18n.t('nav.drones')).toBe('Drones');

    i18n.toggle();

    expect(i18n.language()).toBe('de');
    expect(i18n.t('nav.drones')).toBe('Drohnen');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('de');
    expect(document.documentElement.lang).toBe('de');
  });

  it('fills in values', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de');
    const i18n = TestBed.inject(I18nService);

    expect(i18n.t('loans.saved', { drone: 'TELLO-07', group: 'Group 3' })).toBe('TELLO-07 ist an Group 3 ausgeliehen.');
  });

  it('sends the language to the backend', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de');
    TestBed.inject(HttpClient).get('/api/drones').subscribe();

    const request = TestBed.inject(HttpTestingController).expectOne('/api/drones');
    expect(request.request.headers.get('Accept-Language')).toBe('de');
    request.flush([]);
  });

  it('shows the drones page in German, including the status', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de');
    const fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();

    TestBed.inject(HttpTestingController)
      .expectOne('/api/drones')
      .flush([
        { id: 1, name: 'TELLO-07', status: 'Loaned', description: '' },
        { id: 2, name: 'TELLO-08', status: 'Available', description: '' },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Drohnen');
    const statuses = Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      row.querySelectorAll('td')[1].textContent?.trim(),
    );
    expect(statuses).toEqual(['Ausgeliehen', 'Verfügbar']);
  });

  it('updates a page that is already open when the language changes', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    const fixture = TestBed.createComponent(LoansPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/drones').flush([]);
    http.expectOne('/api/student-groups').flush([]);
    http.expectOne('/api/loans?status=Active').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Loans');

    TestBed.inject(I18nService).toggle();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Ausleihen');
    expect(element.textContent).toContain('Keine aktiven Ausleihen.');
  });
});

@Component({ template: '' })
class EmptyPage {}

describe('Page title', () => {
  beforeEach(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'loans', title: 'nav.loans', component: EmptyPage }]),
        { provide: TitleStrategy, useClass: I18nTitleStrategy },
      ],
    });
  });

  afterEach(() => localStorage.removeItem(LANGUAGE_STORAGE_KEY));

  it('shows the page in the chosen language and follows a language switch', async () => {
    await TestBed.inject(Router).navigateByUrl('/loans');
    TestBed.tick();
    expect(TestBed.inject(Title).getTitle()).toBe('Loans · Drone Inventory');

    TestBed.inject(I18nService).toggle();
    TestBed.tick();

    expect(TestBed.inject(Title).getTitle()).toBe('Ausleihen · Drohnenverwaltung');
  });
});
