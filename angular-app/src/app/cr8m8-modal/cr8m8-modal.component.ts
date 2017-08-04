import { Component } from '@angular/core';

import { AppState } from '../app.service';

@Component({
  // The selector is what angular internally uses
  // for `document.querySelectorAll(selector)` in our index.html
  // where, in this case, selector is the string 'home'
  selector: 'cr8m8-modal',  // <home></home>
  // We need to tell Angular's Dependency Injection which providers are in our app.
  providers: [
  ],
  // We need to tell Angular's compiler which directives are in our template.
  // Doing so will allow Angular to attach our behavior to an element
  directives: [
  ],
  // We need to tell Angular's compiler which custom pipes are in our template.
  pipes: [ ],
  // Our list of styles in our component. We may add more to compose many styles together
  styleUrls: [  ],
  // Every Angular template is first compiled by the browser before Angular runs it's compiler
  templateUrl: './cr8m8-modal.template.html'
})

export class Cr8M8Modal {
  // Set our default values
  // TypeScript public modifiers
  constructor(public appState: AppState) {

  }

  ngOnInit() {
    console.log('hello `ModalMajor` component');
    // this.title.getData().subscribe(data => this.data = data);
  }

  toggleCr8M8Modal() {

    return this.appState.set('showCr8M8Modal', (this.appState.get('showCr8M8Modal') ? false : true));

  }

  submitState(value) {
    console.log('submitState', value);
    this.appState.set('value', value);
  }

}
