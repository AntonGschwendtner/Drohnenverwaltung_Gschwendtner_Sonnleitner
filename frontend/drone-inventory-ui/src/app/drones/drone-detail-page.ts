import { DatePipe, DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { ApiService, Drone, Loan, readErrorMessage } from '../api.service';
import { I18nService } from '../i18n.service';
import { EmptyState } from '../shared/empty-state';
import { PageHead } from '../shared/page-head';
import { QrCode } from '../shared/qr-code';
import { statusKey } from '../shared/status';
import { StripSkeleton } from '../shared/strip-skeleton';

/**
 * One drone with its active loan and every returned loan, the newest return first (REQ-018).
 */
@Component({
  selector: 'app-drone-detail-page',
  imports: [DatePipe, EmptyState, PageHead, QrCode, RouterLink, StripSkeleton],
  template: `
    <a class="back-link" routerLink="/drones">{{ i18n.t('drones.back') }}</a>

    @if (loading()) {
      <app-strip-skeleton [rows]="2" />
    } @else if (errorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (drone(); as drone) {
      <app-page-head
        bay="01"
        [kicker]="i18n.t('drones.kicker')"
        [title]="drone.name"
        [lede]="drone.description || i18n.t('drones.noDescription')"
      />

      <p class="detail-status">
        {{ i18n.t('field.status') }}:
        <span [class]="'status-' + drone.status.toLowerCase()">
          {{ i18n.t(statusKey(drone.status)) }}
        </span>
        @if (drone.defectNote) {
          <span class="strip-note defect-note">{{ i18n.t('drones.defectLabel', { defect: drone.defectNote }) }}@if (drone.defectGroupName) { ({{ drone.defectGroupName }})}</span>
        }
      </p>

      @if (drone.deletedAt) {
        <div class="trash-notice" role="status">
          <span>{{ i18n.t('drones.inTrash', { date: (drone.deletedAt | date: 'dd.MM.yyyy') ?? '' }) }}</span>
          <button type="button" class="tool-link restore" (click)="restore(drone)" [disabled]="restoring()" [class.busy]="restoring()">
            {{ i18n.t('trash.restore') }}
          </button>
        </div>
      }
      @if (restoreError(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      @if (!drone.deletedAt) {
      <section class="qr-label" aria-labelledby="drone-qr">
        <h2 id="drone-qr">{{ i18n.t('drones.qrTitle') }}</h2>
        <div class="qr-card">
          <app-qr-code [value]="loanUrl()" [label]="i18n.t('drones.qrLabel', { drone: drone.name })" />
          <div class="qr-text">
            <strong class="qr-name">{{ drone.name }}</strong>
            <span class="qr-hint">{{ i18n.t('drones.qrHint') }}</span>
            <button type="button" class="tool-link label-button" (click)="printLabel()">{{ i18n.t('drones.printLabel') }}</button>
          </div>
        </div>
      </section>
      }

      <section aria-labelledby="drone-active-loan">
        <h2 id="drone-active-loan">{{ i18n.t('details.activeLoan') }}</h2>
        @if (activeLoan(); as loan) {
          <table>
            <thead>
              <tr>
                <th>{{ i18n.t('field.studentGroup') }}</th>
                <th>{{ i18n.t('field.batteries') }}</th>
                <th>{{ i18n.t('field.propellers') }}</th>
                <th>{{ i18n.t('field.loanDate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  @if (loan.studentGroupId !== null) {
                    <a [routerLink]="['/student-groups', loan.studentGroupId]">{{ loan.studentGroupName }}</a>
                  } @else {
                    <span class="former-group">{{ loan.studentGroupName }}</span>
                  }
                </td>
                <td [attr.data-label]="i18n.t('field.batteries')">{{ loan.batteries }}</td>
                <td [attr.data-label]="i18n.t('field.propellers')">{{ loan.propellers }}</td>
                <td [attr.data-label]="i18n.t('field.loanDate')">{{ loan.loanDate | date: 'dd.MM.yyyy' }}</td>
              </tr>
            </tbody>
          </table>
        } @else {
          <app-empty-state>{{ i18n.t('details.noActiveLoan') }}</app-empty-state>
        }
      </section>

      <section aria-labelledby="drone-history">
        <h2 id="drone-history">{{ i18n.t('nav.history') }}</h2>
        @if (returnedLoans().length === 0) {
          <app-empty-state>{{ i18n.t('details.noHistory') }}</app-empty-state>
        } @else {
          <table>
            <thead>
              <tr>
                <th>{{ i18n.t('field.studentGroup') }}</th>
                <th>{{ i18n.t('field.batteries') }}</th>
                <th>{{ i18n.t('field.propellers') }}</th>
                <th>{{ i18n.t('field.loanDate') }}</th>
                <th>{{ i18n.t('field.returnDate') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (loan of returnedLoans(); track loan.id) {
                <tr>
                  <td>
                  @if (loan.studentGroupId !== null) {
                    <a [routerLink]="['/student-groups', loan.studentGroupId]">{{ loan.studentGroupName }}</a>
                  } @else {
                    <span class="former-group">{{ loan.studentGroupName }}</span>
                  }
                </td>
                  <td [attr.data-label]="i18n.t('field.batteries')">{{ loan.batteries }}</td>
                  <td [attr.data-label]="i18n.t('field.propellers')">{{ loan.propellers }}</td>
                  <td [attr.data-label]="i18n.t('field.loanDate')">{{ loan.loanDate | date: 'dd.MM.yyyy' }}</td>
                  <td [attr.data-label]="i18n.t('field.returnDate')">{{ loan.returnDate | date: 'dd.MM.yyyy' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    }
  `,
})
export class DroneDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(I18nService);
  protected readonly statusKey = statusKey;

  protected readonly drone = signal<Drone | null>(null);
  protected readonly restoring = signal(false);
  protected readonly restoreError = signal<string | null>(null);

  /** A drone in the trash comes back from its own page, for example when it was opened from the history (REQ-034). */
  protected restore(drone: Drone): void {
    if (this.restoring()) {
      return;
    }

    this.restoring.set(true);
    this.restoreError.set(null);
    this.api.restoreDrone(drone.id).subscribe({
      next: (restored) => {
        this.restoring.set(false);
        this.drone.set(restored);
      },
      error: (error: unknown) => {
        this.restoring.set(false);
        this.restoreError.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }
  protected readonly loans = signal<Loan[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  // The backend sends the active loan first and then the newest return first.
  protected readonly activeLoan = computed(() => this.loans().find((loan) => loan.status === 'Active') ?? null);
  protected readonly returnedLoans = computed(() => this.loans().filter((loan) => loan.status === 'Returned'));

  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  /** The QR code opens the loan page with this drone chosen (REQ-026). It contains the address of the app. */
  protected readonly loanUrl = computed(() => {
    const origin = this.document.defaultView?.location.origin ?? '';
    return `${origin}/loans?drone=${this.drone()?.id ?? ''}`;
  });

  /** Prints only the label: QR code and name. The class tells the print stylesheet what to keep. */
  protected printLabel(): void {
    const body = this.document.body;
    const view = this.document.defaultView;
    body.classList.add('printing-label');
    view?.addEventListener('afterprint', () => body.classList.remove('printing-label'), { once: true });
    view?.print();
  }

  ngOnInit(): void {
    // switchMap drops the answer for an older id, so a fast change of the address never shows the wrong record.
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        tap(() => {
          this.loading.set(true);
          this.errorMessage.set(null);
        }),
        switchMap((id) =>
          forkJoin({ record: this.api.getDrone(id), loans: this.api.listLoansFor({ droneId: id }) }).pipe(
            map((result) => ({ ...result, error: null as unknown })),
            catchError((error: unknown) => of({ record: null, loans: [] as Loan[], error })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ record, loans, error }) => {
        this.drone.set(record);
        this.loans.set(loans);
        this.errorMessage.set(error === null ? null : readErrorMessage(error, this.i18n.t('error.fallback')));
        this.loading.set(false);
      });
  }
}
