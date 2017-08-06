import {Component, Injectable} from '@angular/core';
import {AppState} from '../app.service';
import {Account} from '../account/account.service';
import { NgForm } from '@angular/common';
import { User } from '../account/user.model';

@Component({
  
  // The selector is what angular internally uses
  // for `document.querySelectorAll(selector)` in our index.html
  // where, in this case, selector is the string 'home'
  selector: 'accountRegistration',  // <home></home>
  // We need to tell Angular's Dependency Injection which providers are in our app.
  providers: [ ],
  // We need to tell Angular's compiler which directives are in our template.
  // Doing so will allow Angular to attach our behavior to an element
  directives: [
  ],
  // We need to tell Angular's compiler which custom pipes are in our template.
  pipes: [  ],
  // Our list of styles in our component. We may add more to compose many styles together
  styleUrls: [ './accountRegistration.css' ],
  // Every Angular template is first compiled by the browser before Angular runs it's compiler
  templateUrl: './accountRegistration.html'

})

export class AccountRegistration {
  response: any = {status:'nothing'};

  user: any = new User();
  // TypeScript public modifiers
  constructor(public appState: AppState,
              public account: Account)
  {

  }

  createUser() {
      this.response = this.account.create(this.user);
  }

  consoleit() {
    console.log(this);
  }

}
