import { NgModule }      from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgaModule } from '../../theme/nga.module';

import { Login } from './login.component';
import { UserLogin } from './components/login/login.component';
import { PasswordReset } from './components/passwordReset';
import { PasswordResetRequest } from './components/passwordResetRequest';

import { routing } from './login.routing';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgaModule,
    routing
  ],
  declarations: [
    Login,
    UserLogin,
    PasswordReset,
    PasswordResetRequest
  ]
})
export default class LoginModule {}
