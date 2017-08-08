import { Component } from '@angular/core';
import { GlobalState } from '../../../../global.state';
import { AppState } from '../../../../app.service';
import { Releases } from '../../../../theme/services';

@Component({
  selector: 'releases',
  template: require('./releasesManager.html'),
  styles: [require('./releasesManager.scss')]
})

export class ReleasesManager {

  constructor(private _state:GlobalState, public appState:AppState, public releases:Releases ) {



  }

}
