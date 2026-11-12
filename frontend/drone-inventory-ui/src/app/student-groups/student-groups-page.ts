import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService, readErrorMessage, StudentGroup } from '../api.service';
import { I18nService } from '../i18n.service';
import { EmptyState } from '../shared/empty-state';
import { PageHead } from '../shared/page-head';
import { matchesSearch, SearchField } from '../shared/search-field';
import { StripSkeleton } from '../shared/strip-skeleton';

@Component({
  selector: 'app-student-groups-page',
  imports: [EmptyState, PageHead, ReactiveFormsModule, SearchField, StripSkeleton],
  template: `
    <app-page-head
      bay="02"
      [kicker]="i18n.t('groups.kicker')"
      [title]="i18n.t('nav.studentGroups')"
      [lede]="i18n.t('groups.lede')"
    />

    <section class="panel" aria-labelledby="new-student-group">
      <h2 id="new-student-group">{{ i18n.t('groups.new') }}</h2>

      @if (saveErrorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="createStudentGroup()">
        <label>
          {{ i18n.t('field.name') }}
          <input formControlName="name" name="name" autocomplete="off" />
        </label>
        <button type="submit" [disabled]="saving()" [class.busy]="saving()">{{ i18n.t('groups.add') }}</button>
      </form>
    </section>

    @if (loading()) {
      <app-strip-skeleton />
    } @else if (loadErrorMessage(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (studentGroups().length === 0) {
      <app-empty-state>{{ i18n.t('groups.empty') }}</app-empty-state>
    } @else {
      <div class="list-tools">
        <app-search-field [label]="i18n.t('search.label')" [placeholder]="i18n.t('groups.searchHint')" [(value)]="search" />
      </div>

      @if (visibleStudentGroups().length === 0) {
        <app-empty-state>{{ i18n.t('groups.noMatch') }}</app-empty-state>
      } @else {
      <table>
        <thead>
          <tr>
            <th>{{ i18n.t('field.name') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (studentGroup of visibleStudentGroups(); track studentGroup.id) {
            <tr>
              <td>{{ studentGroup.name }}</td>
            </tr>
          }
        </tbody>
      </table>
      }
    }
  `,
})
export class StudentGroupsPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly i18n = inject(I18nService);

  protected readonly form = inject(FormBuilder).nonNullable.group({ name: '' });

  protected readonly studentGroups = signal<StudentGroup[]>([]);
  protected readonly loadErrorMessage = signal<string | null>(null);
  protected readonly saveErrorMessage = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly loading = signal(true);

  /** The search narrows the loaded list in the browser (REQ-011). */
  protected readonly search = signal('');
  protected readonly visibleStudentGroups = computed(() =>
    this.studentGroups().filter((studentGroup) => matchesSearch(studentGroup.name, this.search())),
  );

  ngOnInit(): void {
    this.loadStudentGroups();
  }

  protected loadStudentGroups(): void {
    this.api.listStudentGroups().subscribe({
      next: (studentGroups) => {
        this.studentGroups.set(studentGroups);
        this.loadErrorMessage.set(null);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
        this.loading.set(false);
      },
    });
  }

  // The backend checks the name, so the form sends what was entered and shows its answer.
  protected createStudentGroup(): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.saveErrorMessage.set(null);

    this.api.createStudentGroup(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.loadStudentGroups();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.saveErrorMessage.set(readErrorMessage(error, this.i18n.t('error.fallback')));
      },
    });
  }
}
