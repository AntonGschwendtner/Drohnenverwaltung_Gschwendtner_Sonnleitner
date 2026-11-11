import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { routes } from './app.routes';
import { I18nTitleStrategy } from './i18n-title.strategy';
import { languageInterceptor } from './language.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([languageInterceptor])),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: I18nTitleStrategy },
  ]
};
