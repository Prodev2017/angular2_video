import { Routes, RouterModule }  from '@angular/router';

import { Login } from './login.component';
import { UserLogin } from './components/login/login.component';
import { PasswordReset } from './components/passwordReset';
import { PasswordResetRequest } from './components/passwordResetRequest';

// noinspection TypeScriptValidateTypes
const routes: Routes = [
  {
    path: '',
    component: Login,
    children: [
      
      { path: '', redirectTo: 'user', pathMatch: 'full' },
      { path: 'user',  component: UserLogin },
      { path: 'request-password-reset',  component: PasswordResetRequest },
      { path: 'new-password',  component: PasswordReset },


    ]
  }
];


export const routing = RouterModule.forChild(routes);
