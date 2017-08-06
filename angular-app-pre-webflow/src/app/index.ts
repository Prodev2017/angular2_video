// App
export * from './app.component';
export * from './app.service';

import { AppState } from './app.service';
import { Account } from './account';
import { WaveSurferService } from './wavesurfer';
import { AuthGuard } from './account/authGuard.service';

// Application wide providers
export const APP_PROVIDERS = [
  AppState,
  Account,
  AuthGuard,
  WaveSurferService
];
