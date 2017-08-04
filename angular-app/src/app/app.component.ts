/*
 * Angular 2 decorators and services
 */
import { Component, ViewEncapsulation } from '@angular/core';

import { AppState } from './app.service';
var WaveSurfer = require('wavesurfer.js/dist/wavesurfer.min.js');

/*
 * App Component
 * Top Level Component
 */
@Component({
  selector: 'app',
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
  ],
  templateUrl: 'app.template.html'
})
export class App {

  constructor(
    public appState: AppState) {

  }

  ngOnInit() {

    console.log('Initial App State', this.appState.state);

    var wavesurferPlayer = WaveSurfer.create({

      container: '#mainplayer',

      waveColor: '#001264',

      progressColor: '#0012af'

    });

    console.log(wavesurferPlayer);

    this.appState.wavesurfer = wavesurferPlayer;

  }

}

/*
 * Please review the https://github.com/AngularClass/angular2-examples/ repo for
 * more angular app examples that you may copy/paste
 * (The examples may not be updated as quickly. Please open an issue on github for us to update it)
 * For help or questions please contact us at @AngularClass on twitter
 * or our chat on Slack at https://AngularClass.com/slack-join
 */
