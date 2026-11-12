import { TestBed } from '@angular/core/testing';
import { PageHead } from './page-head';

describe('PageHead', () => {
  it('reads the title as one word and flips every letter on its own', async () => {
    const fixture = TestBed.createComponent(PageHead);
    fixture.componentRef.setInput('bay', '03');
    fixture.componentRef.setInput('kicker', 'Bay 03 · Airborne');
    fixture.componentRef.setInput('title', 'Loans');
    fixture.componentRef.setInput('lede', 'Loan a drone.');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const heading = element.querySelector('h1') as HTMLHeadingElement;

    expect(heading.getAttribute('aria-label')).toBe('Loans');
    expect(heading.textContent?.trim()).toBe('Loans');
    expect(heading.querySelectorAll('.flap')).toHaveLength(5);
    expect(element.querySelector('.bay-number')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('flips the letters again when the title changes', async () => {
    const fixture = TestBed.createComponent(PageHead);
    fixture.componentRef.setInput('bay', '03');
    fixture.componentRef.setInput('kicker', '');
    fixture.componentRef.setInput('title', 'Loans');
    fixture.componentRef.setInput('lede', '');
    await fixture.whenStable();
    const first = (fixture.nativeElement as HTMLElement).querySelector('.flap');

    fixture.componentRef.setInput('title', 'Ausleihen');
    await fixture.whenStable();
    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1') as HTMLHeadingElement;

    expect(heading.textContent?.trim()).toBe('Ausleihen');
    expect(heading.querySelector('.flap')).not.toBe(first);
  });
});
