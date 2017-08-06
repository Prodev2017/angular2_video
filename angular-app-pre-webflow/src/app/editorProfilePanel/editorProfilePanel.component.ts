import {Component} from '@angular/core';
import {AppState} from '../app.service';

@Component({
  // The selector is what angular internally uses
  // for `document.querySelectorAll(selector)` in our index.html
  // where, in this case, selector is the string 'home'
  selector: 'editor-panel',  // <home></home>
  providers: [ ],
  template: require('./editorProfilePanel.html')
})
export class EditorProfilePanel {
  showEditorPanel:boolean;
  constructor(public appState: AppState) {
    this.showEditorPanel = this.appState.get('showEditorPanel');
  }
}
