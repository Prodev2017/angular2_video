import { Injectable } from '@angular/core';
import { AppState } from '../app.service';

declare var WaveSurfer: any;
declare var jQuery: any;

@Injectable()
export class WaveSurferService {
  wavesurfer: any;

  public trackTitle:string;
  public trackArtist:string;
  public trackArtistsFeatured:string;
  public trackVersion:string;
  public cleanDirty:any;
  public versionType:any;
  public introType:any;
  public outroType:any;

  constructor(private appState: AppState) {

  }
  initialize() {
    return this.wavesurfer = WaveSurfer.create({
      container: '#waveform',
      hideScrollbar: true
    });
  }
  playOrPause() {
    console.log(this.appState.get('state'));
    if (this.appState.get('isPlaying') == false) {
      this.appState.set('isPlaying', true);
    }  else {
      this.appState.set('isPlaying', false);
    }
  }
}
