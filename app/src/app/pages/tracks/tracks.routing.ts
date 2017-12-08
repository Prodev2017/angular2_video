import { Routes, RouterModule }  from '@angular/router';

import { Tracks } from './tracks.component';

import { TrackList } from './components/trackList/trackList.component';
import { AuthGuard } from '../../app.auth-guard.service';

// noinspection TypeScriptValidateTypes
const routes: Routes = [
  {
    path: '',
    component: Tracks,
    canActivate: [AuthGuard],
    children: [
     { path: '', redirectTo: '/pages/tracks/crates', pathMatch: 'full'},
     { path: ':view', component: TrackList}

    ]
  }
];

export const routing = RouterModule.forChild(routes);
