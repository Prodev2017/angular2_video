import { Routes, RouterModule }  from '@angular/router';

import { Editors } from './editors.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { Uploader } from './components/uploader/uploader.component';
import { EditorProfile } from './components/profile/profile.component';
import { EditorTracksComponent } from './components/tracks/tracks.component';

import { AuthGuard } from '../../app.auth-guard.service';
import { EditorGuard } from '../../app.editor-guard.service';

// noinspection TypeScriptValidateTypes
const routes: Routes = [
  {
    path: '',
    component: Editors,
    canActivate: [AuthGuard, EditorGuard],
    children: [
            { path: '', redirectTo: 'welcome', component: WelcomeComponent },

      { path: 'welcome', component: WelcomeComponent },
      { path: 'uploader', component: Uploader },
      { path: 'profile', component: EditorProfile }, 
      { path: 'tracks', component: EditorTracksComponent },
      { path: '**', redirectTo: 'welcome', component: WelcomeComponent }

     // { path: 'accounting', component: EditorAccounting }
      
    ]
  }
];

export const routing = RouterModule.forChild(routes);
