import { Routes, RouterModule }  from '@angular/router';

import { Members } from './members.component';
import { MemberProfile } from './components/profile/profile.component';

import { AuthGuard } from '../../app.auth-guard.service';

// noinspection TypeScriptValidateTypes
const routes: Routes = [
  {
    path: '',
    component: Members,
    canActivate: [AuthGuard],
    children: [
      { path: 'profile', component: MemberProfile }, 
      { path: '**', redirectTo: 'profile', component: MemberProfile }
    ]
  }
];

export const routing = RouterModule.forChild(routes);
