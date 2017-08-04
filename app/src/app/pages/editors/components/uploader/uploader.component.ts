import { Component, ViewChild, NgZone, ElementRef, Directive } from '@angular/core';
import {NgStyle} from '@angular/common';
import { Observable } from 'rxjs/Observable';
import { GlobalState } from '../../../../global.state';
import { AppState } from '../../../../app.service';
import { TrackEditor } from '../../../../theme/components/trackEditor';
import { ReleaseEditor } from '../../../../theme/components/releaseEditor';
import { TagService, Genres, OriginalWorks, GigTypes, Releases,UploadService, Publish, AuthService } from '../../../../theme/services';
import { FileUploader } from 'ng2-file-upload/ng2-file-upload';
import * as moment from 'moment';
import {mp3Parser} from './uploader.loader';
import { ModalModule, ModalDirective} from 'ng2-bootstrap/ng2-bootstrap';
import {SelectItem, Dropdown } from 'primeng/primeng';
import { Currency } from '../../../../theme/services/currency';
import * as _ from 'lodash';
declare var MP4Box;

@Component({
  selector: 'uploader',
  template: require('./uploader.html'),
  styles: [require('./uploader.scss')]
})

export class Uploader {
  @ViewChild(TrackEditor) trackEditor:TrackEditor;
  @ViewChild('dataTable') tableBody:any;
  @ViewChild('readyTracksTable') readyTracksTable:any;
  @ViewChild('releasesDataTable') releasesDataTable:any;
  @ViewChild('migrationTrackTable') migrationTrackTable:any;
  @ViewChild(ReleaseEditor) releaseEditor:ReleaseEditor;

  selectedCurrencyId:string;
  selectedCurrencySlug:string;
  selectedCurrency:any;
  datePickerTopPosition:number;
  activeList:string;
  trackCurrentlyLoaded:any = {};
  releasesList:Array<any> = [];
  isPlayerPlaying:boolean = false;
  currentProgress:number = 0;
  fileUploader:any;
  videoFileUploader:any;
  selectedUploader:any;
  draggedTrack:any;
  expandedRows:any = [];
  isSubmitAllInProgress:boolean = false;
  tracksAndReleasesReady:boolean = false;
  dropzoneColorByCurrency:string = '#000000';
  dropzoneActive:boolean = false;
  tableScrollHeight:string;
  tracksToAddToReleases:any;
  tracksToSubmit:any = [];
  releasesToSubmit:any = [];
  tracksReadyToPublishCount:number = 0;
  publishButtonDisabled:boolean = false;
  pollingProcessId:any;
  events:Array<any> = [];
  constructor(private _state:GlobalState, public uploadService:UploadService,
    public currency:Currency, public tags:TagService,
    public genres:Genres, public appState:AppState, public zone:NgZone,
    public releases:Releases, public publishService: Publish, public authService:AuthService) {

      this.events.push(this._state.subscribe('releases.updated', (data) => {

        //this.expandedRows = this.expandedRows.concat(data.releases);
        this.checkTrackAndReleasesValidity();
        this.updateTracksByValidationStatus();

      }));

      this.events.push(this._state.subscribe('track.updatingFinished', (data) => {

        this.checkTrackAndReleasesValidity();
        this.updateTracksByValidationStatus();

      }));

      this.events.push(this._state.subscribe('releases.created', (data) => {

        this.addSelectedTracksToRelease(data.release);

      }));

      this.events.push(this._state.subscribe('videojs.progressChanged', (data) => {

        this.addSelectedTracksToRelease(data.release);

      }));

      this.events.push(this._state.subscribe('player.play', () => {
        this.isPlayerPlaying = true;
      }));

            this.events.push(this._state.subscribe('player.pause', () => {
        this.isPlayerPlaying = false;
      }));

      this.events.push(this._state.subscribe('player.toggle', (data) => {

        this.trackCurrentlyLoaded = data;

      }));


      this.events.push(this._state.subscribe('currency.changed', (currency) => {
                console.log('currency changed on uploader');

        this.setupUploaderForCurrency(currency);

      }));

    }

    addSelectedTracksToRelease(release) {

      this.tracksToSubmit = this.tracksToSubmit.filter( (item) => {
        
        if(item.crooklynClanv1AutoMigrated) {
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Cannot Add v1 Migrated Track to Release', detail: item.formattedName + ' cannot be added to a release because it is a migrated track from v1.'});
        }
        
        return !item.crooklynClanv1AutoMigrated;  
      });
      
      this.tracksToSubmit.forEach( (track) => {
        this.assignTrackToRelease(track, release);
      });

      this.tracksToSubmit = [];

    }

    unselectAllTracks() {
      this.tracksToSubmit = [];
    }

    adjustTableHeight() {

      var contentArea = document.querySelector('.uploader-tabs > .tab-content .tab-pane.active .ui-datatable-scrollable-header');
      //console.log(contentArea);
      if(contentArea)
      {

        var availableHeight = contentArea.getBoundingClientRect().height + contentArea.getBoundingClientRect().top;
        var startOfTabElement = document.querySelector('.fixed-height-body');

        var startOfTabContentTop = startOfTabElement.getBoundingClientRect().top;
        var startOfTabContentHeight = startOfTabElement.getBoundingClientRect().height;
        var differenceBetweenBodyAndTabContent = startOfTabContentTop + startOfTabContentHeight;
        var tableBodyHeight = differenceBetweenBodyAndTabContent - availableHeight - 30;
        //console.log(availableHeight, startOfTabContentTop, startOfTabContentHeight, differenceBetweenBodyAndTabContent, tableBodyHeight);

        if(this.tableBody) {
          this.tableScrollHeight = this.tableBody.el.nativeElement.querySelector('.ui-datatable-scrollable-body').style.maxHeight = (tableBodyHeight) + 'px';
          this.tableScrollHeight = this.tableBody.el.nativeElement.querySelector('.ui-datatable-scrollable-body').style.height = (tableBodyHeight) + 'px';
        }

        if(this.migrationTrackTable) {
          this.tableScrollHeight = this.migrationTrackTable.el.nativeElement.querySelector('.ui-datatable-scrollable-body').style.maxHeight = (tableBodyHeight) + 'px';
          this.tableScrollHeight = this.migrationTrackTable.el.nativeElement.querySelector('.ui-datatable-scrollable-body').style.height = (tableBodyHeight) + 'px';
        }

        if(this.releasesDataTable) {
          this.tableScrollHeight = this.releasesDataTable.el.nativeElement.querySelector('.ui-datatable-scrollable-body').style.maxHeight = (tableBodyHeight) + 'px';
          this.tableScrollHeight = this.releasesDataTable.el.nativeElement.querySelector('.ui-datatable-scrollable-body').style.height = (tableBodyHeight) + 'px';
        }

      }

      if(this.readyTracksTable) {
          this.tableScrollHeight = this.readyTracksTable.el.nativeElement.querySelector('.ui-datatable-scrollable-body').style.maxHeight = (tableBodyHeight) + 'px';
          this.tableScrollHeight = this.readyTracksTable.el.nativeElement.querySelector('.ui-datatable-scrollable-body').style.height = (tableBodyHeight) + 'px';
      }

    }

    ngDoCheck() {
      this.adjustTableHeight();
    }

ngOnDestroy() {
  
        console.log('the events that we will unsubscribe from', this.events);
      for(var i = 0; i < this.events.length; i++) {
        
        this._state.unsubscribe(this.events[i].event, this.events[i].callback);
        
      }
      
      this.events = [];
      clearInterval(this.pollingProcessId);
  
}
  

    runAudioFileUploaderConfiguration() {

      this.fileUploader.onAfterAddingFile = (item) => {
        var reader = new FileReader();
        reader.onload = () => {
          var fileIndex = this.fileUploader.getIndexOfItem(item);
          if(item._file.trackIdToReplace) {
            this.fileUploader.queue[fileIndex].alias = 'replace_track_for_' + item._file.trackIdToReplace || 'file';
          }

          if(item._file.type != 'audio/mp3') {
            this.fileUploader.queue[fileIndex].isError = true;
            this.fileUploader.queue[fileIndex].isReady = false;
            this.fileUploader.queue[fileIndex].isUploaded = true;
            this.fileUploader.queue[fileIndex].isUploading = false;
            this.fileUploader.queue[fileIndex].errorMessage = "Invalid file type: must be an MP3";
            this.uploadService.rejectedTracks.results.push({
              originalFileName: item._file.name, message: { title: this.fileUploader.queue[fileIndex].errorMessage }
            });
            this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.fileUploader.queue[fileIndex].errorMessage});
          } else {

            var tags = mp3Parser.readTags(new DataView(reader.result));
            //console.log(tags[1].header.bitrate,tags);

            var bitrate;

            if(tags && tags.length > 0) {
              for(var i = 0; i < tags.length; i++) {
                if(tags[i].header.bitrate) {
                  bitrate = tags[i].header.bitrate;
                }
              }
            }

            if(tags && tags.length > 0 && bitrate < 320) {
              this.fileUploader.queue[fileIndex].isError = true;
              this.fileUploader.queue[fileIndex].isReady = false;
              this.fileUploader.queue[fileIndex].isUploaded = true;
              this.fileUploader.queue[fileIndex].isUploading = false;
              this.fileUploader.queue[fileIndex].errorMessage = "Bit rate is below the 320Kbps minimum.";
              this.uploadService.rejectedTracks.results.push({
                originalFileName: item._file.name, message: { title: this.fileUploader.queue[fileIndex].errorMessage }
              });
              this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.fileUploader.queue[fileIndex].errorMessage});

            } else if(tags.length == 0) {

              this.fileUploader.queue[fileIndex].isError = true;
              this.fileUploader.queue[fileIndex].isReady = false;
              this.fileUploader.queue[fileIndex].isUploaded = true;
              this.fileUploader.queue[fileIndex].isUploading = false;
              this.fileUploader.queue[fileIndex].errorMessage = "Invalid MP3 file";

              this.uploadService.rejectedTracks.push({
                originalFileName: item._file.name, message: { title: this.fileUploader.queue[fileIndex].errorMessage }
              });

              this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.fileUploader.queue[fileIndex].errorMessage});


            } else {

              //console.log(this.selectedCurrencyId);

              this.fileUploader.queue[fileIndex].url = '/api/v1/members/track/createPreview?currencyId=' + this.selectedCurrencyId;
              this.uploadService.trackList.results.push(this.fileUploader.queue[fileIndex]);
              this.updateTracksByValidationStatus();
              this.fileUploader.queue[fileIndex].upload();

            }
          }

        };

        reader.readAsArrayBuffer(item.some);
      }

      this.fileUploader.onProgressItem = (item: any, progress: any) => {
        this.zone.run( () => {
          var uploadQueueItemIndex = this.uploadService.trackList.results.indexOf(item);
          
          this.uploadService.trackList.results[uploadQueueItemIndex].actualProgress = progress;

        });

      }

      this.fileUploader.onCompleteItem = (item: any, response: any, status: any, headers: any) => {
        if(this.fileUploader.getNotUploadedItems().length == 0) {
          //  this.showUploadQueueTable = false;
        }

        var responseObject = JSON.parse(response);

        if(responseObject.error) {

          this.uploadService.rejectedTracks.results.push(responseObject);

        } else {

          var newTrack = responseObject.Track;

          var uploadQueueItemIndex = this.uploadService.trackList.results.indexOf(item);

          var results = this.uploadService.trackList.results[uploadQueueItemIndex] = newTrack;

          for(var property in newTrack) {
            //console.log(property,newTrack[property]);
            if(this.uploadService.trackValidationRequirements.hasOwnProperty(property)) {
              //console.log(property,newTrack[property]);
              this.uploadService.validateTrackField(property,newTrack[property],uploadQueueItemIndex);
            }
          }

          this.uploadService.updateTrackValidationStatus(uploadQueueItemIndex);

          this.checkTrackAndReleasesValidity();
          //this.adjustTableHeight();
          this.updateTracksByValidationStatus();

          this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Track Uploaded Successfully', detail: newTrack.originalFileName});

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


    }

    runVideoFileUploaderConfiguration() {

      this.videoFileUploader.onAfterAddingFile = (item) => {
        var reader = new FileReader();
        reader.onload = () => {
          var fileIndex = this.videoFileUploader.getIndexOfItem(item);
          if(item._file.trackIdToReplace) {
            this.videoFileUploader.queue[fileIndex].alias = 'replace_track_for_' + item._file.trackIdToReplace || 'file';
          }

          if(item._file.type != 'video/mp4') {
            this.videoFileUploader.queue[fileIndex].isError = true;
            this.videoFileUploader.queue[fileIndex].isReady = false;
            this.videoFileUploader.queue[fileIndex].isUploaded = true;
            this.videoFileUploader.queue[fileIndex].isUploading = false;
            this.videoFileUploader.queue[fileIndex].errorMessage = "Invalid file type: must be an MP4 video";
            this.uploadService.rejectedTracks.results.push({
              originalFileName: item._file.name, message: { title: this.videoFileUploader.queue[fileIndex].errorMessage }
            });
            this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.videoFileUploader.queue[fileIndex].errorMessage});
          } else {

            //console.log(tags[1].header.bitrate,tags);

            var bitrate;
            var tags;


            var chunkSize  = 1024 * 1024; // bytes
            var fileSize   = item.some.size;
            var offset     = 0;
            var self       = this; // we need a reference to the current object
            var readBlock  = null;
            var startDate  = new Date();

            var mp4box = new MP4Box(false);

            mp4box.onError = function(e) {
              console.log("mp4box failed to parse data.");
            };

            var onparsedbuffer = function(mp4box, buffer) {
              buffer.fileStart = offset;
              mp4box.appendBuffer(buffer);
            }

            var onBlockRead = function(evt) {
              if (evt.target.error == null) {
                onparsedbuffer(mp4box, evt.target.result); // callback for handling read chunk
                offset += evt.target.result.byteLength;
              } else {
                console.log("Read error: " + evt.target.error);
                return;
              }
              if (offset >= fileSize) {
                mp4box.flush();
                return;
              }

              readBlock(offset, chunkSize, item.some);
            }

            var readBlock:any = (_offset, length, _file) => {
              var r = new FileReader();
              var blob = _file.slice(_offset, length + _offset);
              r.onload = onBlockRead;
              r.readAsArrayBuffer(blob);
            }

            readBlock(offset, chunkSize, item.some);

            mp4box.onReady = (mp4info) => {
              console.log('mp4box info',mp4info);
              if(mp4info && mp4info.audioTracks && mp4info.audioTracks.length === 0) {

                this.videoFileUploader.queue[fileIndex].isError = true;
                this.videoFileUploader.queue[fileIndex].isReady = false;
                this.videoFileUploader.queue[fileIndex].isUploaded = true;
                this.videoFileUploader.queue[fileIndex].isUploading = false;
                this.videoFileUploader.queue[fileIndex].errorMessage = "Video track does not have an audio track.";
                this.uploadService.rejectedTracks.results.push({
                  originalFileName: item._file.name, message: { title: this.videoFileUploader.queue[fileIndex].errorMessage }
                });
                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.videoFileUploader.queue[fileIndex].errorMessage});

              } else if(mp4info && mp4info.audioTracks && mp4info.audioTracks[0] &&  mp4info.audioTracks[0].bitrate < 300000) {
                this.videoFileUploader.queue[fileIndex].isError = true;
                this.videoFileUploader.queue[fileIndex].isReady = false;
                this.videoFileUploader.queue[fileIndex].isUploaded = true;
                this.videoFileUploader.queue[fileIndex].isUploading = false;
                this.videoFileUploader.queue[fileIndex].errorMessage = "Audio bitrate is below the 320Kbps minimum.";
                this.uploadService.rejectedTracks.results.push({
                  originalFileName: item._file.name, message: { title: this.videoFileUploader.queue[fileIndex].errorMessage }
                });
                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.videoFileUploader.queue[fileIndex].errorMessage});

              } else if(mp4info && mp4info.videoTracks && mp4info.videoTracks[0] && mp4info.videoTracks[0].bitrate < 2000000) {
                this.videoFileUploader.queue[fileIndex].isError = true;
                this.videoFileUploader.queue[fileIndex].isReady = false;
                this.videoFileUploader.queue[fileIndex].isUploaded = true;
                this.videoFileUploader.queue[fileIndex].isUploading = false;
                this.videoFileUploader.queue[fileIndex].errorMessage = "Video bitrate is below the 2000Kbps minimum.";
                this.uploadService.rejectedTracks.push({
                  originalFileName: item._file.name, message: { title: this.videoFileUploader.queue[fileIndex].errorMessage }
                });
                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.videoFileUploader.queue[fileIndex].errorMessage});

              } else if(mp4info && mp4info.videoTracks && mp4info.videoTracks[0] && (mp4info.videoTracks[0].track_height < 540 || mp4info.videoTracks[0].track_width < 960)) {
                this.videoFileUploader.queue[fileIndex].isError = true;
                this.videoFileUploader.queue[fileIndex].isReady = false;
                this.videoFileUploader.queue[fileIndex].isUploaded = true;
                this.videoFileUploader.queue[fileIndex].isUploading = false;
                this.videoFileUploader.queue[fileIndex].errorMessage = "Video frame must be at least 960px by 540px.";
                this.uploadService.rejectedTracks.results.push({
                  originalFileName: item._file.name, message: { title: this.videoFileUploader.queue[fileIndex].errorMessage }
                });
                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.videoFileUploader.queue[fileIndex].errorMessage});

              } else if(tags && tags.length == 0) {

                this.videoFileUploader.queue[fileIndex].isError = true;
                this.videoFileUploader.queue[fileIndex].isReady = false;
                this.videoFileUploader.queue[fileIndex].isUploaded = true;
                this.videoFileUploader.queue[fileIndex].isUploading = false;
                this.videoFileUploader.queue[fileIndex].errorMessage = "Invalid MP4 file";

                this.uploadService.rejectedTracks.results.push({
                  originalFileName: item._file.name, message: { title: this.videoFileUploader.queue[fileIndex].errorMessage }
                });

                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.videoFileUploader.queue[fileIndex].errorMessage});


              } else {

                //console.log(this.selectedCurrencyId);

                this.videoFileUploader.queue[fileIndex].url = '/api/v1/members/track/createVideoPreview?currencyId=' + this.selectedCurrencyId;
                this.uploadService.trackList.results.push(this.videoFileUploader.queue[fileIndex]);
                this.updateTracksByValidationStatus();
                this.videoFileUploader.queue[fileIndex].upload();

              }


            }


          }

        };

        reader.readAsArrayBuffer(item.some);
      }

      this.videoFileUploader.onProgressItem = (item: any, progress: any) => {

        this.zone.run( () => {
          var uploadQueueItemIndex = this.uploadService.trackList.results.indexOf(item);
          this.uploadService.trackList.results[uploadQueueItemIndex].actualProgress = progress;

        });

      }

      this.videoFileUploader.onCompleteItem = (item: any, response: any, status: any, headers: any) => {
        if(this.videoFileUploader.getNotUploadedItems().length == 0) {
          //  this.showUploadQueueTable = false;
        }

        var responseObject = JSON.parse(response);

        if(responseObject.error) {

          this.uploadService.rejectedTracks.push(responseObject);

        } else {

          var newTrack = responseObject.Track;

          var uploadQueueItemIndex = this.uploadService.trackList.results.indexOf(item);

          var results = this.uploadService.trackList.results[uploadQueueItemIndex] = newTrack;

          for(var property in newTrack) {
            //console.log(property,newTrack[property]);
            if(this.uploadService.trackValidationRequirements.hasOwnProperty(property)) {
              //console.log(property,newTrack[property]);
              this.uploadService.validateTrackField(property,newTrack[property],uploadQueueItemIndex);
            }
          }

          this.uploadService.updateTrackValidationStatus(uploadQueueItemIndex);

          this.checkTrackAndReleasesValidity();
          //this.adjustTableHeight();
          this.updateTracksByValidationStatus();

          this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Track Uploaded Successfully', detail: newTrack.originalFileName});

        }
      };

      this.videoFileUploader.uploadAll = () => {

        let items = this.videoFileUploader.getNotUploadedItems().filter((item) => !item.isUploading);

        if (!items.length) {
          return;
        }

        items.map((item) => item._prepareToUploading());

        for(var i = 0; i < items.length; i++) {

          items[i].upload();
          this.videoFileUploader.isUploading = false;

        }

      }


    }

    ngOnInit() {

      this.tags.getTags();
      this.genres.getGenres();
      this.pollingProcessId = setInterval(() => {
        this.pollForProcessingStatus() 
      }, 10000);



    }

  ngAfterViewInit() {
    
            this.setupUploaderForCurrency(this.currency.selectedCurrency);

  }
    
    setupUploaderForCurrency(currency) {
      
                                        if(this.authService.authResponse.profileData.currencies.length > 0) {
                                                                                  this._state.notifyDataChanged('spinner.show', {});

        this.selectedCurrencyId = currency._id;
        this.selectedCurrencySlug = currency.slug;
        this.selectedCurrency = currency;
        this.trackEditor.selectedCurrency = this.selectedCurrency;
        
        this.loadDraftTracksForCurrency(this.selectedCurrencyId, 1);
       // this.loadDraftMigrationTracksForCurrency(this.selectedCurrencyId, 1);

        this.getDraftReleases();

        if(this.selectedCurrencySlug != 'video-vault') {

          this.fileUploader = new FileUploader({

            url: '/api/v1/members/track/createPreview?currencyId=' + currency.currencyId

          });
          this.runAudioFileUploaderConfiguration();
          this.selectedUploader = this.fileUploader;

        }

        if(this.selectedCurrencySlug == 'video-vault') {

          this.videoFileUploader = new FileUploader({

            url: '/api/v1/members/track/createVideoPreview?currencyId=' + currency.currencyId

          });

          this.runVideoFileUploaderConfiguration();
          this.selectedUploader = this.videoFileUploader;

        }
        } else {

        }

      
    }

    getCurrencyFileUploader() {

      if(this.selectedCurrencySlug == 'audio-vault') {
        return this.fileUploader;
      } else {
        return this.videoFileUploader;
      }

    }

    changePage(event, trackList) {

      console.log(event, trackList);

      if(trackList == 'draftMigrationTrackList') {

        var page = (event.first / event.rows) + 1;

       // this.loadDraftMigrationTracksForCurrency(this.selectedCurrencyId, page);

      }

    }

    updateTracksByValidationStatus() {
      
      this.uploadService.updateTracksByValidationStatus();
            
    }

    loadDraftTracksForCurrency(currencyId, page) {
                                        this._state.notifyDataChanged('spinner.show', {});

      this.uploadService.selectedCurrencyId = currencyId;

      this.uploadService.getDraftTracks(currencyId, page).subscribe((res) => {

        this.uploadService.trackList = res.Tracks || [];

        for(var i = 0; i < this.uploadService.trackList.results.length; i++) {

              this.uploadService.updateTrackValidationStatus(i);

        }

        this.checkTrackAndReleasesValidity();
        this.updateTracksByValidationStatus();
                                        this._state.notifyDataChanged('spinner.hide', {});

        return false;

      } );


    }

    loadDraftMigrationTracksForCurrency(currencyId, page) {
                                       // this._state.notifyDataChanged('spinner.show', {});

      this.uploadService.getDraftMigrationTracks(currencyId,page).subscribe((res) => {
        
        this.uploadService.draftMigrationTrackList = res.Tracks || [];

        for(var i = 0; i < this.uploadService.draftMigrationTrackList.results.length; i++) {

          for(var property in this.uploadService.draftMigrationTrackList.results[i]) {
            
            if(this.uploadService.trackValidationRequirements.hasOwnProperty(property)) {
              this.uploadService.validateTrackField(property,this.uploadService.draftMigrationTrackList.results[i][property],i);
              this.uploadService.updateTrackValidationStatus(i);
            }
            
          }
        }

        this.checkTrackAndReleasesValidity();
        this.updateTracksByValidationStatus();
                                     //   this._state.notifyDataChanged('spinner.hide', {});

      } );

    }

    getTracksNeedingEditing():Array<any> {
      
      return this.uploadService['tracksNotReadyToPublish'].filter((track) => {
        return !track.validation.isTrackValid;
      });
      
    }
    
    pollForProcessingStatus() {
      console.log('polling for processing status');
      if(this.uploadService && this.uploadService.trackList && this.uploadService.trackList.results && this.uploadService.trackList.results.length > 0){
              console.log('got draft tracks to go through');

        var trackIdsToPoll = this.uploadService.trackList.results.filter( (item) => {
          return !item.draftTrackUploadedToS3 && item._id && !item.crooklynClanv1AutoMigrated && item.status == 'draft';
        }).map( (item) => {
          return item._id;
        });
                      console.log('tracks not marked as uploaded yet', trackIdsToPoll.length);

        for(var i = 0; i < trackIdsToPoll.length; i++) {
          
          this.uploadService.getTrack(trackIdsToPoll[i]).subscribe( (res) => {
            
            if(res.Track.draftTrackUploadedToS3 == true && res.Track.hiBitRateFile) {
              
              var trackIndex = this.uploadService.trackList.results.findIndex( (item) => {
                return item._id.toString() == res.Track._id.toString();
              });
              
              this.uploadService.trackList.results[trackIndex].draftTrackUploadedToS3 = res.Track.draftTrackUploadedToS3;
              this.uploadService.trackList.results[trackIndex].hiBitRateFile = res.Track.hiBitRateFile;
              this.updateTracksByValidationStatus();
              
            }
            
          })
          
        }
        
      }

    }


    getApprovedTracks():Array<any> {
      
      return this.uploadService['tracksNotReadyToPublish'].filter((track) => {
        return track.validation.isTrackValid;
      });
      
    }

    lengthCounter(arrayToCount) {
      
      return arrayToCount.length;
      
    }

    showTrackEditor (track) {
      
      var trackIndex = this.uploadService.trackList.results.findIndex( (item) => {
        
        return item._id.toString() == track._id.toString();
        
      })
      
      this.trackEditor.trackIndexCurrentlyEditing = trackIndex;
      
      this.trackEditor.activeList = this.activeList;
      
      this.trackEditor.selectedCurrency = this.selectedCurrency;
      
      this.trackEditor.setupUploaderForCurrency(this.selectedCurrency);

      this.trackEditor.modal.show();

      this._state.notifyDataChanged('track.editor.show', {});

    };

    showReleaseEditor (release) {

      var releaseIndex = this.releases.draftList.indexOf(release);
      this.releaseEditor.releaseIndexCurrentlyEditing = releaseIndex;
      this.releaseEditor.releaseId = release._id;
      this.releaseEditor.selectedCurrency = this.selectedCurrency;
      this.releases.draftList[releaseIndex].validation = this.releases.validateRelease(releaseIndex,this.selectedCurrency);
      this._state.notifyDataChanged('release.editor.show', this.selectedCurrency);
      this.releaseEditor.modal.show();

    };

    createRelease () {

      this.releaseEditor.releaseIndexCurrentlyEditing = null;
      this.releaseEditor.selectedCurrency = this.selectedCurrency;
      this.releaseEditor.configureSnippetUploader(this.releaseEditor.selectedCurrency);
      this.releaseEditor.modal.show();

    };


    submitAllApprovedTracksAndReleases() {

      var approvedTracks = this.uploadService['tracksNotReadyToPublish'].filter( (track) => {
        return track.validation.isTrackValid;
      });

      var approvedReleases = this.releases.draftList.filter( (release) => {
        return release.validation && release.validation.isReleaseValid;
      });

      this.publishService.publishTracksAndReleases(approvedTracks, approvedReleases).subscribe( (response) => {

        this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Content Submitted', detail: 'Thank you for submitting your tracks and/or releases! They will be processed and available in The Vault shortly. We will send you an email notification once it is completed.'});
        this.loadDraftTracksForCurrency(this.selectedCurrencyId, 1);
        //this.loadDraftMigrationTracksForCurrency(this.selectedCurrencyId, 1);
        this.getDraftReleases();

      });

    }

  submitSelectedApprovedTracksAndReleases() {
      this.publishButtonDisabled = true;

      var approvedTracks = this.tracksToSubmit.filter( (track) => {
      return track.validation.isTrackValid;
    });

    var approvedReleases = this.releasesToSubmit.filter( (release) => {
      return release.validation && release.validation.isReleaseValid;
    });
                                                                                  this._state.notifyDataChanged('spinner.show', {});


     //console.log(this.releasesToSubmit);
     
      this.publishService.publishTracksAndReleases(this.tracksToSubmit, this.releasesToSubmit).subscribe( (response) => {
      this.publishButtonDisabled = false;
      
      for(var i = 0; i < this.tracksToSubmit.length; i++) {
        
        var theIndex:any = this.uploadService.tracksReadyToPublish.results.indexOf(this.tracksToSubmit[i]);
        this.uploadService.tracksReadyToPublish.results.splice(theIndex, 1);
        
      }
      for(var i = 0; i < this.releasesToSubmit.length; i++) {
      
        var theIndex:any = this.releases.draftList.indexOf(this.releasesToSubmit[i]);
        this.releases.draftList.splice(theIndex, 1);
        
      }
      
      this.tracksToSubmit = [];
      this.releasesToSubmit = [];
      this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Content Submitted', detail: 'Thank you for submitting your tracks and/or releases! They will be processed and available in The Vault shortly. We will send you an email notification once it is completed.'});
      this.loadDraftTracksForCurrency(this.selectedCurrencyId,1);
      this.getDraftReleases();
                                                                                  this._state.notifyDataChanged('spinner.hide', {});


      });

    }


    logIt(values) {
      //console.log(values);
    }

    submitApprovedTrack (track) {

      var trackIndex = this.uploadService['tracksNotReadyToPublish'].results.indexOf(track);
      this.uploadService['tracksNotReadyToPublish'].results[trackIndex].isSubmitting = true;
      this.uploadService.submitValidatedTrack(track).subscribe((res) => {
        this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Track Submitted Successfully', detail: res.Track.name});
        var trackIndex = this.uploadService['tracksNotReadyToPublish'].results.indexOf(track);
        this.uploadService['tracksNotReadyToPublish'].results.splice(trackIndex,1);
        var approvedTracks = this.uploadService['tracksNotReadyToPublish'].results.filter( (track) => {
          return track.validation.isTrackValid;
        });
        if(approvedTracks.length == 0 && this.releases.draftList.length > 0) {
          this.publishAllReleases();
        } else if(approvedTracks.length == 0 && this.releases.draftList.length == 0) {
          this.isSubmitAllInProgress = false;
        }
        //this.tracks.list.push(res.Track);
      });
    }

    showDatepicker ($event,track) {
      //console.log($event);
      var needsEditingTrackIndex = this.uploadService['tracksNotReadyToPublish'].results.indexOf(track);
      // console.log($event.srcElement.parentElement.parentElement.parentElement.offsetTop,$event.srcElement.parentElement.parentElement.parentElement.offsetHeight);
      this.datePickerTopPosition = $event.srcElement.parentElement.parentElement.parentElement.offsetTop + $event.srcElement.parentElement.parentElement.parentElement.offsetHeight;
      this.uploadService['tracksNotReadyToPublish'][needsEditingTrackIndex].showDatepicker = true;

    };

    updateTrackPublishDate (track, trackList) {
      //console.log(track.publishDate);
      var needsEditingTrackIndex = this.uploadService['tracksNotReadyToPublish'].results.indexOf(track);
      this.uploadService[trackList]['results'][needsEditingTrackIndex].publishDate = track.publishDate;
      //console.log(needsEditingTrackIndex, this.uploadService['tracksNotReadyToPublish'][needsEditingTrackIndex].publishDate);
      this.uploadService.updateField('publishDate', this.uploadService['tracksNotReadyToPublish']['results'][needsEditingTrackIndex].publishDate, needsEditingTrackIndex, trackList);
      this.uploadService[trackList]['results'][needsEditingTrackIndex].showDatepicker = false;

    };

    removeTrack(track) {
                                                                                  this._state.notifyDataChanged('spinner.show', {});

      var needsEditingTrackIndex = this.uploadService.trackList.results.findIndex( (item) => {
        
        return track._id.toString() == item._id.toString();
        
      });
      
      if(needsEditingTrackIndex !== -1) {
       
        this.uploadService.removeTrack(needsEditingTrackIndex).subscribe((res) => {
          
          if(res.success) {
            
            var filename = track.originalFileName;
            
            this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Track Deleted', detail: filename});
            
            needsEditingTrackIndex = this.uploadService.trackList.results.findIndex( (item) => {
        
              return track._id.toString() == item._id.toString();
              
            });
            
            this.uploadService.trackList.results.splice(needsEditingTrackIndex,1);
            
            this.updateTracksByValidationStatus();
                                                                                              this._state.notifyDataChanged('spinner.hide', {});

          }
        });

        
      } else {
        
        this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Track Cannot Be Deleted', detail: 'This track is either a migrated track or can no longer be found to delete.'});

      }

    };

    togglePlayPause (track) {

        var trackPlayerData = {
          name: track.name  || '[title not set]',
          version: track.version || '[version not set]',
          artistPrimaryName: track.artistPrimaryName  || '[artist not set]',
          artistsFeaturedPrimaryName: track.artistsFeaturedPrimaryName,
          _id: track._id,
          url: track.hiBitRateFile.url,
          waveformUrl: track.waveformImageFileUrl,
          fileType: track.fileType
        }

        this._state.notifyDataChanged('player.toggle', trackPlayerData);

    };

    getTagName(tagId) {
      for(var i = 0; i < this.tags.list.length; i++) {
        if(this.tags.list[i]._id === tagId) {
          return this.tags.list[i].name;
        }
      }
    }

    getDraftReleases() {

      return this.releases.getTracksByDraftRelease(this.selectedCurrencyId).subscribe( (res) => {

        this._state.notifyDataChanged('releases.updated', {releases: res.Releases});

        this.releases.draftList = res.Releases;
        
        for(var i = 0; i < this.releases.draftList.length; i++) {

          this.releases.draftList[i].validation = this.releases.validateRelease(i, this.selectedCurrency);

        }

        this.checkTrackAndReleasesValidity();

      });

    }

    allTracksArePublished(release) {

      var allTracksArePublished = true;

      release.tracks.forEach( (track) => {

        allTracksArePublished = allTracksArePublished && track.enabled && (track.status == 'published');

      });

      return allTracksArePublished;

    }

    removeRelease(release) {

      var releaseIndex = this.releases.draftList.indexOf(release);
                                                                                  this._state.notifyDataChanged('spinner.show', {});

      if(this.releases.draftList[releaseIndex].tracks.length > 0) {
        var releaseInReleasesToSubmitIndex = this.releasesToSubmit.indexOf(release);

        this.releases.removeRelease(release).subscribe( (res) => {

          if(res.success) {

            if(releaseInReleasesToSubmitIndex !== -1) {
              this.releasesToSubmit = this.releasesToSubmit.splice(releaseInReleasesToSubmitIndex, 1);
            }

            for(var i = 0; i < this.releases.draftList[releaseIndex].tracks.length; i++) {
              var trackToUpdate = this.releases.draftList[releaseIndex].tracks[i];
              this.removeTrackFromRelease(trackToUpdate, release);
            }

            this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Release Deleted', detail: release.name});
            this.releases.getTracksByDraftRelease(this.selectedCurrencyId).subscribe( (draftList) => {
              this.releases.draftList = draftList.Releases;
              for(var i = 0; i < this.releases.draftList.length; i++) {
                this.releases.draftList[i].validation = this.releases.validateRelease(i, this.selectedCurrency);
              }
              this.checkTrackAndReleasesValidity();
              this._state.notifyDataChanged('releases.updated', {releases: draftList.Releases});
                                                                                  this._state.notifyDataChanged('spinner.hide', {});

            });



          }

        });

      } else {
                                                                                  this._state.notifyDataChanged('spinner.show', {});

        this.releases.removeRelease(release).subscribe( (res) => {

          if(res.success) {

            this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Release Deleted', detail: release.name});
            this.releases.getTracksByDraftRelease(this.selectedCurrencyId).subscribe( (draftList) => {
              this.releases.draftList = draftList.Releases;
              for(var i = 0; i < this.releases.draftList.length; i++) {
                this.releases.draftList[i].validation = this.releases.validateRelease(i, this.selectedCurrency);
              }
              this.checkTrackAndReleasesValidity();
              this._state.notifyDataChanged('releases.updated', {releases: draftList.Releases});
                                                                                  this._state.notifyDataChanged('spinner.hide', {});

            });

          }

        });

      }

    }

    publishRelease(release) {

      var releaseIndex = this.releases.draftList.indexOf(release);
      if(release.validation && release.validation.isReleaseValid) {
        this.releases.draftList[releaseIndex].isSubmitting = true;
        this.releases.publishRelease(release).subscribe( (res) => {
          this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Release Published', detail: release.name});
          this.checkTrackAndReleasesValidity();
          if(this.releases.draftList.length == 1) {
            this.isSubmitAllInProgress = false;
          }
          this.getDraftReleases();
        });
      }

    }

    publishAllReleases() {

      if(this.releases.draftList && this.releases.draftList.length > 0) {
        this.isSubmitAllInProgress = true;
        for (var i = 0; i < this.releases.draftList.length; i++) {
          var release = this.releases.draftList[i];
          this.publishRelease(release);
        }

      }

    }

    dragTrackToReleaseStart(event,track) {
      this.draggedTrack = track;
    }

    assignTrackToRelease(track, release) {

      var trackIndex = this.uploadService.trackList.results.findIndex( (item) => {
        
        return track._id.toString() == item._id.toString();
        
      });
      
      var tracksToSubmitIndex = this.tracksToSubmit.indexOf(track);
      var selectedRelease = this.releases.draftList.find( (element, index) => {

        return release._id == element._id;

      });

      var releaseIndex = this.releases.draftList.indexOf(selectedRelease);

      this.uploadService.updateTrackRelease(trackIndex,release._id).subscribe( (res) => {
        this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Track Added to Release', detail: res.Track.name + ' added to ' + release.name});

        this.releases.getRelease(release._id).subscribe( (updatedRelease) => {

          this.releases.draftList[releaseIndex] = updatedRelease;

          var updatedRow = this.expandedRows.find( (releaseItem, index) => {
            return updatedRelease._id == releaseItem._id;
          });

          var updatedRowIndexInExpandedRowArray = this.expandedRows.indexOf(updatedRow);

          if(updatedRowIndexInExpandedRowArray != -1) {
            this.expandedRows[updatedRowIndexInExpandedRowArray] = updatedRelease;
          }


          this.releases.draftList[releaseIndex].validation = this.releases.validateRelease(releaseIndex, this.selectedCurrency);
          this._state.notifyDataChanged('releases.updated', {release: updatedRelease});

        });

      });


    }

    dragTrackToReleaseEnd(event) {
      //console.log('This is a drag end', event);
      this.draggedTrack = {};
    }

    removeTrackFromRelease(track, release) {

      var trackIndex;

      var releaseIndex = this.releases.draftList.indexOf(release);

      var trackIndex = this.uploadService.trackList.results.findIndex( (trackItem) => {
        return trackItem._id.toString() == track._id.toString();
      });
                                                                                        this._state.notifyDataChanged('spinner.show', {});

      this.uploadService.removeTrackFromRelease(trackIndex).subscribe( (res) => {
        this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Track Removed from Release', detail: res.Track.name + ' removed from ' + release.name});

        if(typeof this.releases.draftList[releaseIndex] !== 'undefined') {

          this.releases.draftList[releaseIndex].tracks = this.releases.draftList[releaseIndex].tracks.filter( (track) => {
            return track._id !== res.Track._id;
          });

          var updatedRow = this.expandedRows.find( (releaseItem, index) => {
            return this.releases.draftList[releaseIndex]._id == releaseItem._id;
          });

          var updatedRowIndexInExpandedRowArray = this.expandedRows.indexOf(updatedRow);

          if(updatedRowIndexInExpandedRowArray != -1) {
            this.expandedRows[updatedRowIndexInExpandedRowArray] = this.releases.draftList[releaseIndex];
          }


          this._state.notifyDataChanged('releases.updated', {release: this.releases.draftList[releaseIndex]});
          this.releases.draftList[releaseIndex].validation = this.releases.validateRelease(releaseIndex, this.selectedCurrency);
                                                                                  this._state.notifyDataChanged('spinner.hide', {});


        }


      });

    }

    getReleaseValidationColor(release) {

      return (release.validation.isReleaseValid) ? 'inherit' : '#d9534f';

    }

    checkTrackAndReleasesValidity() {

      var approvedTracks = this.uploadService['tracksNotReadyToPublish'].results.filter( (track) => {
        return (track.validation && track.validation.isTrackValid) ? true : false;
      });

      var approvedReleases = this.releases.draftList.filter( (release) => {
        return (release.validation && release.validation.isReleaseValid) ? true : false;
      });

      if( (approvedTracks.length > 0 && (this.releases.draftList.length > 0 && approvedReleases.length == this.releases.draftList.length)) || (approvedTracks.length > 0 && this.releases.draftList.length == 0)) {
        this.tracksAndReleasesReady = true;
      } else {
        this.tracksAndReleasesReady = false;
      }

    }

    public setCurrencyBackgroundColor(e:any):void {

      e.target.style.backgroundImage = 'radial-gradient(circle farthest-corner at 50% 50%,' + this.currency.selectedCurrency.color + ', #000)';

    }


    public removeCurrencyBackgroundColor(e:any):void {

      e.target.style.backgroundImage = 'radial-gradient(circle farthest-corner at 50% 50%,#000000, #000)';

    }

    public triggerFileOverStateFileUploader($on, $element:ElementRef) {

      this.updateDropzoneColorFileUploader($on, $element);

    }

    public updateDropzoneColorFileUploader($on, $element) {

      if($on) {
        $element.style.backgroundImage = 'radial-gradient(circle farthest-corner at 50% 50%,' + this.currency.selectedCurrency.color + ', #000)';
        $element.style.fontSize = '5vw';
      } else {
        $element.style.backgroundImage = 'radial-gradient(circle farthest-corner at 50% 50%,#000000, #000)';
        $element.style.fontSize = '3vw';
      }

    }

    public triggerFileOverStateReleaseEditor($on, $element:ElementRef) {

      this.updateDropzoneColorReleaseEditor($on, $element);

    }

    public updateDropzoneColorReleaseEditor($on, $element) {

      if($on) {
        $element.style.backgroundImage = 'radial-gradient(circle farthest-corner at 50% 50%,' + this.currency.selectedCurrency.color + ', #000)';
        $element.style.fontSize = '1.1vw';
      } else {
        $element.style.backgroundImage = 'radial-gradient(circle farthest-corner at 50% 50%,#000000, #000)';
        $element.style.fontSize = '1vw';
      }

    }

    submitSelectedTracksAndReleases() {

      //console.log('tracks',this.tracksToSubmit);

      //console.log('releases', this.releasesToSubmit);

    }

    selectAllTracks() {

      this.tracksToSubmit = _.clone(this.uploadService.tracksReadyToPublish.results);

    }


  }
