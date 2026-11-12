import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { I18nTitleStrategy } from './i18n-title.strategy';
import { languageInterceptor } from './language.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([languageInterceptor])),
    // A new page slides into the bay like a fresh strip. Browsers without view transitions just switch.
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true })),
    { provide: TitleStrategy, useClass: I18nTitleStrategy },
  ]
};
