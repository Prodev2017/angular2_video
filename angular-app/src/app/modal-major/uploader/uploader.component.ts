import { Component } from '@angular/core';
import {CORE_DIRECTIVES, FORM_DIRECTIVES} from '@angular/common';
import { AppState } from '../../app.service';
import { CurrencyService } from '../../currency';
import {urlPrefix} from '../../globals/globals.service';
import {FILE_UPLOAD_DIRECTIVES, FileUploader} from 'ng2-file-upload/ng2-file-upload';
import { UploadService } from '../../uploadService';
var mp3Parser = require('mp3-parser');

@Component({
  // The selector is what angular internally uses
  // for `document.querySelectorAll(selector)` in our index.html
  // where, in this case, selector is the string 'home'
  selector: 'uploader',  // <home></home>
  // We need to tell Angular's Dependency Injection which providers are in our app.
  providers: [
    UploadService
  ],
  // We need to tell Angular's compiler which directives are in our template.
  // Doing so will allow Angular to attach our behavior to an element
  directives: [
    FILE_UPLOAD_DIRECTIVES
  ],
  // We need to tell Angular's compiler which custom pipes are in our template.
  pipes: [ ],
  // Our list of styles in our component. We may add more to compose many styles together
  styleUrls: [  ],
  // Every Angular template is first compiled by the browser before Angular runs it's compiler
  templateUrl: './uploader.template.html'
})
export class Uploader {
  // Set our default values
  // TypeScript public modifiers
  selectedCurrencyForUploads:any;
  showCurrencySelectMenu:boolean = false;
  rejectedTracks:Array<any> = [];
  tracksNeedingEditing:Array<any> = [];
  approvedTracks:Array<any> = [];
  fileUploader:FileUploader = new FileUploader({
    url: urlPrefix + '/api/v1/members/track/createPreview',
    autoUpload: true
  });

  constructor(public appState: AppState,
              public currencyService: CurrencyService,
              public uploadService:UploadService ) {
  }

  ngOnInit() {
    console.log('hello `Uploader` component');
    console.log(this.currencyService.list);

    this.uploadService.getDraftTracks().subscribe((res) => {

      this.tracksNeedingEditing = res.Tracks || [];

      for(var i = 0; i < this.tracksNeedingEditing.length; i++) {

        for(var property in this.tracksNeedingEditing[i]) {
          //console.log(property,newTrack[property]);
          if(this.uploadService.trackValidationRequirements.hasOwnProperty(property)) {
            //console.log(property,newTrack[property]);
            this.tracksNeedingEditing[i].validation = this.uploadService.updateTrackValidationStatus(this.uploadService.validateTrackField(property,this.tracksNeedingEditing[i][property]),property,this.tracksNeedingEditing[i].validation);

          }
        }
      }

      //console.log(this.tracksToModify);

      return this.tracksNeedingEditing;

    } );

    this.fileUploader.onAfterAddingFile = (item) => {
      //console.log(item);
             var reader = new FileReader();
             reader.onload = () => {
               var fileIndex = this.fileUploader.getIndexOfItem(item);
               if(item._file.trackIdToReplace) {
                 this.fileUploader.queue[fileIndex].alias = 'replace_track_for_' + item._file.trackIdToReplace || 'file';
               }

                 var tags = mp3Parser.readTags(new DataView(reader.result));
                 //console.log(tags[1].header.bitrate,tags);

                 if(tags[1].header.bitrate < 320) {
                   this.fileUploader.queue[fileIndex].isError = true;
                   this.fileUploader.queue[fileIndex].isReady = false;
                   this.fileUploader.queue[fileIndex].isUploaded = true;
                   this.fileUploader.queue[fileIndex].errorMessage = "Bit rate is below 320kbps";
                 }
             };

             reader.readAsArrayBuffer(item.some);
    }

    this.fileUploader.onProgressAll = (progress:any) => {

      var totalBytesToUpload:number = 0;
      var currentBytesUploaded:number = 0;

      for(var i = 0; i < this.fileUploader.queue.length; i++) {

        //console.log(this.fileUploader.queue[i]);

        if(this.fileUploader.queue[i].isError) {

          //console.log('Should be ignoring', this.fileUploader.queue[i]);

        } else {

          totalBytesToUpload += this.fileUploader.queue[i].some.size;
          currentBytesUploaded += (this.fileUploader.queue[i].some.size * this.fileUploader.queue[i].progress);

        }

      }

      var newProgress = Math.round(currentBytesUploaded) / Math.round(totalBytesToUpload);
      this.fileUploader.progress = 100;
      //console.log(this.fileUploader.progress);
      return 100;

    }

    this.fileUploader.onCompleteItem = (item: any, response: any, status: any, headers: any) => {
      if(this.fileUploader.getNotUploadedItems().length == 0) {
        //  this.showUploadQueueTable = false;
      }

      var responseObject = JSON.parse(response);
      if(responseObject.error) {

        this.rejectedTracks.push(responseObject);

      } else {

      var newTrack = responseObject.Track;

      for(var property in newTrack) {
        //console.log(property,newTrack[property]);
          if(this.uploadService.trackValidationRequirements.hasOwnProperty(property)) {
            //console.log(property,newTrack[property]);
            newTrack.validation = this.uploadService.updateTrackValidationStatus(this.uploadService.validateTrackField(property,newTrack[property]),property,newTrack.validation)
          }
        }
        this.tracksNeedingEditing.push(newTrack);
      }
    };

    this.fileUploader.uploadAll = () => {

      let items = this.fileUploader.getNotUploadedItems().filter((item) => !item.isUploading);

      if (!items.length) {
        return;
      }

      items.map((item) => item._prepareToUploading());

      for(var i = 0; i < items.length; i++) {

        items[i].upload();
        this.fileUploader.isUploading = false;

      }

    }

    // this.title.getData().subscribe(data => this.data = data);
  }

  toggleCurrencySelectMenu() {

    this.showCurrencySelectMenu = (this.showCurrencySelectMenu) ? false : true;

  }

  toggleUploaderTab(tabID) {

    //console.log(tabID);
    return this.appState.set('currentMajorModalUploaderTab', tabID);

  }

  loadTrackToPlay(track) {

    this.appState.wavesurfer.load(track.hiBitRateFile.url);
    this.appState.wavesurfer.on('ready',() => {
      this.appState.wavesurfer.play();
    });

  }

  toggleModalMajor() {

    return this.appState.set('showModalMajor', (this.appState.get('showModalMajor') ? false : true ));

  }

  setCurrencyForUploads(currencyId, currencyLabel) {

    //console.log("[UPLOADER] Currency Set To: ",currencyId, currencyLabel);
    this.selectedCurrencyForUploads = {id: currencyId, label: currencyLabel};

  }

  submitState(value) {
    //console.log('submitState', value);
    this.appState.set('value', value);
  }

}
