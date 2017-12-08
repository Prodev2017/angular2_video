import { Routes, RouterModule }  from '@angular/router';
import { Pages } from './pages.component';

// noinspection TypeScriptValidateTypes
const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => System.import('./login/login.module')
  },
  {
    path: 'register',
    loadChildren: () => System.import('./register/register.module')
  },
  {
    path: 'pages',
    component: Pages,
    children: [
      { path: 'tracks', loadChildren: () => System.import('./tracks/tracks.module') }, 
      { path: 'editors', loadChildren: () => System.import('./editors/editors.module') },
      { path: 'members', loadChildren: () => System.import('./members/members.module') }
    ]
  }
];

export const routing = RouterModule.forChild(routes);
