import { Injectable } from '@angular/core';

import { AppState } from '../app.service';

var WaveSurfer = require('wavesurfer.js/dist/wavesurfer.min.js');

@Injectable()
export class WaveSurferPlayer {
    playerInstance:any;
    constructor() {
      
    }
    create(opts) {
        this.playerInstance = WaveSurfer.create(opts);  //drawGauge() is a function inside d3gauge.js
    }
}
