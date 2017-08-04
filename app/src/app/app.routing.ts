import { Routes, RouterModule } from '@angular/router';

export const routes: Routes = [
  { path: '**', redirectTo: 'pages/editors' }
];

export const routing = RouterModule.forRoot(routes, { useHash: true });
