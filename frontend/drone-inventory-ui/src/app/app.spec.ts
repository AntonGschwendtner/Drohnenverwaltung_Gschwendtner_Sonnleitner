import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('shows a link to every view', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const links = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('nav a'));

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/today',
      '/drones',
      '/student-groups',
      '/loans',
      '/history',
    ]);
  });

  it('opens the page Today by default (scenario "Open the app")', async () => {
    TestBed.createComponent(App);

    await TestBed.inject(Router).navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/today');
  });

  it('marks the open view in the navigation', async () => {
    const fixture = TestBed.createComponent(App);

    await TestBed.inject(Router).navigateByUrl('/loans');
    await fixture.whenStable();

    const active = fixture.nativeElement.querySelector('nav a.active') as HTMLAnchorElement;
    expect(active.textContent).toContain('Loans');
  });

  it('sends unknown addresses to the page Today', async () => {
    TestBed.createComponent(App);

    await TestBed.inject(Router).navigateByUrl('/does-not-exist');

    expect(TestBed.inject(Router).url).toBe('/today');
  });
});
