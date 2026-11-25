import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { App } from '../app';
import { routes } from '../app.routes';
import { I18nService } from '../i18n.service';
import { ThemeService } from '../theme.service';
import { PAGE_RELOAD } from './settings-dialog';

/** Scenarios of "Settings dialog", "General reset" and "Backup and restore" in the app (REQ-037 to REQ-039). */
describe('Settings dialog', () => {
  let fixture: ComponentFixture<App>;
  let http: HttpTestingController;
  let element: HTMLElement;
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorage.removeItem('drone-inventory-language');
    localStorage.removeItem('drone-inventory-theme');
    reload = vi.fn();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting(), { provide: PAGE_RELOAD, useValue: reload }],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(I18nService).use('en');
    TestBed.inject(ThemeService).use('light');
    fixture = TestBed.createComponent(App);
    element = fixture.nativeElement as HTMLElement;
    await TestBed.inject(Router).navigateByUrl('/drones');
    await settle();
    http.match(() => true).forEach((request) => request.flush([]));
    await settle();
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('drone-inventory-language');
    localStorage.removeItem('drone-inventory-theme');
  });

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function dialog(): HTMLElement | null {
    return element.querySelector('.settings-dialog');
  }

  function input(selector: string): HTMLInputElement {
    return dialog()?.querySelector(selector) as HTMLInputElement;
  }

  async function openSettings(): Promise<void> {
    (element.querySelector('button.settings-button') as HTMLButtonElement).click();
    await settle();
  }

  async function click(selector: string): Promise<void> {
    (element.querySelector(selector) as HTMLElement).click();
    await settle();
  }

  it('Open the settings', async () => {
    await openSettings();

    expect(dialog()?.querySelector('h2')?.textContent).toContain('Settings');
    expect(TestBed.inject(Router).url).toBe('/drones');
    expect(element.querySelector('.lang-toggle, .theme-toggle')).toBeNull();
  });

  it('Close without changes', async () => {
    await openSettings();
    await click('.settings-dialog input[name="language"][value="de"]');
    await click('.settings-dialog input[name="theme"][value="dark"]');

    await click('.settings-dialog .dialog-close');

    expect(dialog()).toBeNull();
    expect(TestBed.inject(I18nService).language()).toBe('en');
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
  });

  it('closes with Escape without changes', async () => {
    await openSettings();
    await click('.settings-dialog input[name="language"][value="de"]');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();

    expect(dialog()).toBeNull();
    expect(TestBed.inject(I18nService).language()).toBe('en');
  });

  it('Apply language and mode', async () => {
    await openSettings();
    await click('.settings-dialog input[name="language"][value="de"]');
    await click('.settings-dialog input[name="theme"][value="dark"]');

    await click('.settings-dialog button.apply');

    expect(dialog()).toBeNull();
    expect(TestBed.inject(I18nService).language()).toBe('de');
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
    expect(element.querySelector('button.settings-button')?.getAttribute('aria-label')).toBe('Einstellungen');
    http.expectNone({ method: 'POST' });
    expect(reload).not.toHaveBeenCalled();
  });

  it('Reset not confirmed', async () => {
    await openSettings();
    await click('.settings-dialog input[name="deleteAllDrones"]');

    await click('.settings-dialog button.apply');
    expect(dialog()?.querySelector('.settings-confirm')?.textContent).toContain('Delete all drones');
    await click('.settings-dialog button.confirm-cancel');

    http.expectNone('/api/admin/reset');
    expect(dialog()?.querySelector('button.apply')).not.toBeNull();
  });

  it('sends only the ticked parts of the reset after the confirmation and reloads', async () => {
    await openSettings();
    await click('.settings-dialog input[name="returnAllDrones"]');
    await click('.settings-dialog input[name="deleteAllStudentGroups"]');
    await click('.settings-dialog button.apply');

    const steps = Array.from(dialog()?.querySelectorAll('.settings-confirm li') ?? []).map((item) => item.textContent?.trim());
    expect(steps).toEqual(['Return all drones', 'Delete all student groups']);
    await click('.settings-dialog button.confirm-run');

    const request = http.expectOne({ method: 'POST', url: '/api/admin/reset' });
    expect(request.request.body).toEqual({
      returnAllDrones: true,
      deleteAllDrones: false,
      deleteAllStudentGroups: true,
      deleteHistory: false,
    });
    request.flush({ returnedLoans: 1, deletedDrones: 0, deletedStudentGroups: 2, deletedLoans: 0 });
    await settle();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows why a reset failed and keeps the dialog open', async () => {
    await openSettings();
    await click('.settings-dialog input[name="deleteHistory"]');
    await click('.settings-dialog button.apply');
    await click('.settings-dialog button.confirm-run');

    http.expectOne('/api/admin/reset').flush({ detail: 'Choose at least one part of the reset.' }, { status: 400, statusText: 'Bad Request' });
    await settle();

    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain('Choose at least one part');
    expect(reload).not.toHaveBeenCalled();
  });

  it('offers the backup as a download', async () => {
    await openSettings();

    const link = dialog()?.querySelector('a.backup-download') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/api/admin/backup');
    expect(link.hasAttribute('download')).toBe(true);
  });

  it('restores a chosen backup after the confirmation', async () => {
    await openSettings();
    const file = new File(['SQLite format 3'], 'drohnenverwaltung-backup-2026-08-19.db');
    const fileInput = input('input[type="file"]');
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change'));
    await settle();

    await click('.settings-dialog button.apply');
    expect(dialog()?.querySelector('.settings-confirm')?.textContent).toContain('drohnenverwaltung-backup-2026-08-19.db');
    await click('.settings-dialog button.confirm-run');

    const request = http.expectOne({ method: 'POST', url: '/api/admin/restore' });
    expect((request.request.body as FormData).get('file')).toBeInstanceOf(File);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
