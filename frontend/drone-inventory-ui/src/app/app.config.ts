import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { I18nTitleStrategy } from './i18n-title.strategy';
import { languageInterceptor } from './language.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([languageInterceptor])),
    // A new page slides into the bay like a fresh strip. Browsers without view transitions just switch.
    // Every page change starts at the top of the new page; back and forward return to the old position (REQ-043).
    provideRouter(
      routes,
      withViewTransitions({ skipInitialTransition: true }),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    { provide: TitleStrategy, useClass: I18nTitleStrategy },
  ]
};
