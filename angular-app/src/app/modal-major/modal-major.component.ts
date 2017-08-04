import { Component } from '@angular/core';

import { AppState } from '../app.service';
import { Uploader } from './uploader';

@Component({
  // The selector is what angular internally uses
  // for `document.querySelectorAll(selector)` in our index.html
  // where, in this case, selector is the string 'home'
  selector: 'modal-major',  // <home></home>
  // We need to tell Angular's Dependency Injection which providers are in our app.
  providers: [

  ],
  // We need to tell Angular's compiler which directives are in our template.
  // Doing so will allow Angular to attach our behavior to an element
  directives: [
    Uploader
  ],
  // We need to tell Angular's compiler which custom pipes are in our template.
  pipes: [ ],
  // Our list of styles in our component. We may add more to compose many styles together
  styleUrls: [  ],
  // Every Angular template is first compiled by the browser before Angular runs it's compiler
  templateUrl: './modal-major.template.html'
})
export class ModalMajor {
  // Set our default values
  // TypeScript public modifiers
  constructor(public appState: AppState) {

  }

  ngOnInit() {
    console.log('hello `ModalMajor` component');
    // this.title.getData().subscribe(data => this.data = data);
  }

  toggleTab(tabID) {

    console.log(tabID);
    return this.appState.set('currentMajorModalTab', tabID);

  }

  toggleModalMajor() {

    return this.appState.set('showModalMajor', (this.appState.get('showModalMajor') ? false : true ));

  }

  submitState(value) {
    console.log('submitState', value);
    this.appState.set('value', value);
  }

}
