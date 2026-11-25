import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, computed, ElementRef, inject, InjectionToken, output, signal, viewChild } from '@angular/core';
import { concat, last, Observable, tap } from 'rxjs';
import { ApiService, readErrorMessage, ResetRequest } from '../api.service';
import { I18nService, Language } from '../i18n.service';
import { Theme, ThemeService } from '../theme.service';

/** Reloads the page after a reset or restore, so every list shows the new data. Replaced in tests. */
export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', {
  factory: () => {
    const document = inject(DOCUMENT);
    return () => document.defaultView?.location.reload();
  },
});

type ResetChoice = keyof ResetRequest;

/**
 * The settings as a pop-up in the middle of the screen (REQ-037); the address does not change. The X closes
 * without changes, "Apply" applies language and mode and runs a ticked general reset (REQ-038) or a chosen backup
 * restore (REQ-039) after one more confirmation. Downloading a backup happens at once.
 */
@Component({
  selector: 'app-settings-dialog',
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    <div class="dialog-backdrop" (click)="close()"></div>
    <div #dialog class="dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <button type="button" class="dialog-close" (click)="close()" [disabled]="busy()" [attr.aria-label]="i18n.t('settings.close')">×</button>
      <h2 id="settings-title">{{ i18n.t('settings.title') }}</h2>

      @if (errorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      @if (pendingConfirm()) {
        <div class="settings-confirm" role="alertdialog" aria-labelledby="settings-confirm-title">
          <h3 id="settings-confirm-title">{{ i18n.t('settings.confirmTitle') }}</h3>
          <ul>
            @for (step of dangerousSteps(); track step) {
              <li>{{ step }}</li>
            }
          </ul>
          <p>{{ i18n.t('settings.confirmText') }}</p>
          <div class="dialog-actions">
            <button type="button" class="dialog-cancel confirm-cancel" (click)="pendingConfirm.set(false)" [disabled]="busy()">
              {{ i18n.t('dialog.cancel') }}
            </button>
            <button type="button" class="dialog-confirm confirm-run" (click)="run()" [disabled]="busy()" [class.busy]="busy()">
              {{ i18n.t('settings.confirmRun') }}
            </button>
          </div>
        </div>
      } @else {
        <fieldset class="settings-group settings-choice">
          <legend>{{ i18n.t('settings.language') }}</legend>
          <div class="segments">
            <label class="segment"><input type="radio" name="language" value="de" [checked]="language() === 'de'" (change)="language.set('de')" /><span class="segment-code" aria-hidden="true">DE</span> Deutsch</label>
            <label class="segment"><input type="radio" name="language" value="en" [checked]="language() === 'en'" (change)="language.set('en')" /><span class="segment-code" aria-hidden="true">EN</span> English</label>
          </div>
        </fieldset>

        <fieldset class="settings-group settings-choice">
          <legend>{{ i18n.t('settings.mode') }}</legend>
          <div class="segments">
            <label class="segment"><input type="radio" name="theme" value="light" [checked]="theme() === 'light'" (change)="theme.set('light')" /><span class="segment-code" aria-hidden="true">☀</span> {{ i18n.t('theme.day') }}</label>
            <label class="segment"><input type="radio" name="theme" value="dark" [checked]="theme() === 'dark'" (change)="theme.set('dark')" /><span class="segment-code" aria-hidden="true">☾</span> {{ i18n.t('theme.night') }}</label>
          </div>
        </fieldset>

        <fieldset class="settings-group settings-reset">
          <legend>{{ i18n.t('settings.reset') }}</legend>
          @for (choice of resetChoices; track choice) {
            <label class="switch-row">
              <input type="checkbox" role="switch" class="switch" [name]="choice" [checked]="reset()[choice]" (change)="toggleReset(choice)" />
              {{ i18n.t(resetLabels[choice]) }}
            </label>
          }
          <p class="settings-hint">{{ i18n.t('settings.resetHint') }}</p>
        </fieldset>

        <fieldset class="settings-group">
          <legend>{{ i18n.t('settings.backup') }}</legend>
          <a class="tool-link backup-download" href="/api/admin/backup" download>{{ i18n.t('settings.backupDownload') }}</a>
          <label class="settings-file">
            {{ i18n.t('settings.restore') }}
            <input type="file" name="backup" accept=".db,application/vnd.sqlite3" (change)="chooseFile($event)" />
          </label>
        </fieldset>

        <div class="dialog-actions">
          <button type="button" class="dialog-confirm apply" (click)="apply()" [disabled]="busy()" [class.busy]="busy()">
            {{ i18n.t('settings.apply') }}
          </button>
        </div>
      }
    </div>
  `,
})
export class SettingsDialog {
  private readonly api = inject(ApiService);
  private readonly themeService = inject(ThemeService);
  private readonly reloadPage = inject(PAGE_RELOAD);
  protected readonly i18n = inject(I18nService);

  readonly closed = output<void>();

  /** Copies of the current choices; they take effect only with "Apply". */
  protected readonly language = signal<Language>(this.i18n.language());
  protected readonly theme = signal<Theme>(this.themeService.theme());
  protected readonly reset = signal<ResetRequest>({
    returnAllDrones: false,
    deleteAllDrones: false,
    deleteAllStudentGroups: false,
    deleteHistory: false,
  });
  protected readonly backupFile = signal<File | null>(null);
  protected readonly pendingConfirm = signal(false);
  protected readonly busy = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  private changedData = false;

  protected readonly resetChoices: ResetChoice[] = ['returnAllDrones', 'deleteAllDrones', 'deleteAllStudentGroups', 'deleteHistory'];
  protected readonly resetLabels = {
    returnAllDrones: 'settings.returnAllDrones',
    deleteAllDrones: 'settings.deleteAllDrones',
    deleteAllStudentGroups: 'settings.deleteAllStudentGroups',
    deleteHistory: 'settings.deleteHistory',
  } as const;

  /** What "Apply" would do that cannot be undone, as the confirmation lists it. */
  protected readonly dangerousSteps = computed(() => {
    const steps = this.resetChoices.filter((choice) => this.reset()[choice]).map((choice) => this.i18n.t(this.resetLabels[choice]));
    const file = this.backupFile();
    if (file) {
      steps.push(this.i18n.t('settings.restoreStep', { file: file.name }));
    }
    return steps;
  });

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.querySelector<HTMLInputElement>('input:checked')?.focus());
  }

  protected toggleReset(choice: ResetChoice): void {
    this.reset.update((reset) => ({ ...reset, [choice]: !reset[choice] }));
  }

  protected chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.backupFile.set(input.files?.[0] ?? null);
  }

  protected close(): void {
    if (!this.busy()) {
      this.closed.emit();
    }
  }

  /** Language and mode apply at once; a reset or restore asks first. */
  protected apply(): void {
    if (this.dangerousSteps().length > 0) {
      this.errorMessage.set(null);
      this.pendingConfirm.set(true);
      return;
    }

    this.applyLook();
    this.closed.emit();
  }

  /** Runs the confirmed reset and restore, then reloads the page with the new data. */
  protected run(): void {
    if (this.busy()) {
      return;
    }

    // The restore comes first, so a ticked reset applies to the restored data and is not overwritten by it.
    const requests: Observable<unknown>[] = [];
    const file = this.backupFile();
    if (file) {
      requests.push(this.api.restoreBackup(file).pipe(tap(() => (this.changedData = true))));
    }
    if (this.resetChoices.some((choice) => this.reset()[choice])) {
      requests.push(this.api.reset(this.reset()));
    }

    this.busy.set(true);
    this.errorMessage.set(null);
    concat(...requests)
      .pipe(last())
      .subscribe({
        next: () => {
          this.applyLook();
          this.reloadPage();
        },
        error: (error: unknown) => {
          // When the restore already replaced the data, the page must show it even though the reset failed.
          if (this.changedData) {
            this.reloadPage();
            return;
          }

          this.busy.set(false);
          this.pendingConfirm.set(false);
          this.errorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
        },
      });
  }

  private applyLook(): void {
    this.i18n.use(this.language());
    this.themeService.use(this.theme());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (this.pendingConfirm() && !this.busy()) {
        this.pendingConfirm.set(false);
      } else {
        this.close();
      }
      return;
    }

    if (event.key === 'Tab') {
      // Tab and Shift+Tab move through the fields and buttons of the dialog and wrap around.
      event.preventDefault();
      const focusable = Array.from(
        this.dialog().nativeElement.querySelectorAll<HTMLElement>('input, button, a[href]'),
      ).filter((element) => !element.hasAttribute('disabled'));
      const current = focusable.indexOf(document.activeElement as HTMLElement);
      const step = event.shiftKey ? -1 : 1;
      const next = (current + step + focusable.length) % focusable.length;
      focusable[current === -1 ? 0 : next]?.focus();
    }
  }
}
