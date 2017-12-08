import {videojs} from './videoJSPlayer.loader.ts';

import { GlobalState } from '../../../global.state';
import { AppState } from '../../../app.service';

import {NgModule,Directive,ElementRef,HostListener,Input} from '@angular/core';
import {CommonModule} from '@angular/common';

@Directive({
    selector: '[VJSPlayer]'
})
export class VideoJSPlayer  {


    @Input() public wavesurferEnabled:boolean = false;
    @Input() public src:string = "";
    @Input() public waveformWidth:number = 600;
    
    constructor(public el: ElementRef, private _state:GlobalState, public appState:AppState ) {
        console.log('videojs constructor ran', this.el.nativeElement.id);
    }
    
    onTimeUpdate() {

    }
    
    ngAfterViewInit() {

        console.log('videojs after view init ran', this.el.nativeElement.id);

        var videoJSOptions = {
            html5: {
                nativeTextTracks: false
            },
            textTrackSettings: false
        };
        
     
        videojs(this.el.nativeElement.id, videoJSOptions);

    }
    
}
