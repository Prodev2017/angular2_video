import {Component } from '@angular/core';
import { NgForm } from '@angular/common';
import { Router} from "@angular/router";

import {AppState} from '../app.service';
import {Account} from '../account';
import { User } from '../account/user.model';

@Component({
  // The selector is what angular internally uses
  // for `document.querySelectorAll(selector)` in our index.html
  // where, in this case, selector is the string 'home'
  selector: 'accountLogin',  // <home></home>
  // We need to tell Angular's Dependency Injection which providers are in our app.
  providers: [  ],
  // We need to tell Angular's compiler which directives are in our template.
  // Doing so will allow Angular to attach our behavior to an element
  directives: [
  ],
  // We need to tell Angular's compiler which custom pipes are in our template.
  pipes: [  ],
  // Our list of styles in our component. We may add more to compose many styles together
  // Every Angular template is first compiled by the browser before Angular runs it's compiler
  templateUrl: './accountLogin.html'
})

export class AccountLogin {
  response: any = {status:'nothing'};
  user: any = new User();

  // TypeScript public modifiers
  constructor(public appState: AppState,
              public account: Account,
              public router: Router)
  {

  }

  loginUser() {
    this.account.login(this.user)
    .subscribe((res) =>
    {
      console.log(res);
      if(res.success) {
        this.account.loggedIn = res.success && res.session;
        this.account.profileData = res.profileData;
        localStorage.setItem('auth_token', res.userId);
        this.router.navigate(['/member']);

      } else {
        this.account.loggedIn = res.success;
        this.account.response = res.message;
      }

    });
  }

}
