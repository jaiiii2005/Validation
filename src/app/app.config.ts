import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash routing keeps deep links working on GitHub Pages (a static host),
    // where a refresh on /auction would otherwise 404.
    provideRouter(routes, withHashLocation()),
  ],
};
