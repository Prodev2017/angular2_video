import {Component, ViewChild, HostListener, NgZone} from '@angular/core';
import {NgStyle} from '@angular/common';
import { Observable } from 'rxjs/Rx';
import {BaCard, BaCheckbox} from '../';
import { GlobalState } from '../../../global.state';
import { AppState } from '../../../app.service';
import {TagService, Genres, OriginalWorks, GigTypes, Releases,UploadService} from '../../services';
import {FilterAlreadySelectedGenres, FilterTagOptionsForSetting} from '../../pipes/listFilters';
import { ModalDirective } from 'ng2-bootstrap/ng2-bootstrap';
import { OverlayPanel, Tooltip } from 'primeng/primeng';
import { FileUploader } from 'ng2-file-upload/ng2-file-upload';
import {mp3Parser} from './trackEditor.loader.ts';
import * as moment from 'moment';
import './trackEditor.loader.ts';
import * as _ from 'lodash';
declare var MP4Box;

declare var jQuery;
declare var $;

@Component({
  selector: 'track-editor',
  template: require('./trackEditor.html'),
  styles: [require('./trackEditor.scss')],
})
export class TrackEditor {
  @ViewChild('trackEditorModal') public modal: ModalDirective;

  trackIndexCurrentlyEditing:number;
  currentTrackList:string = 'tracksNeedingEditing';
  draftOriginalWork:any = {name: '', version: '', artists: '', artistsFeatured: ''};
  draftRelease:any = {name: ''};
  showSuggestedOriginalWorks:boolean;
  showSuggestedReleases:boolean;
  suggestedOriginalWorksFromName:Array<any>;
  suggestedOriginalWorksFromVersion:Array<any>;
  suggestedOriginalWorksFromArtists:Array<any>;
  suggestedOriginalWorksFromArtistsFeatured:Array<any>;
  suggestedReleases:Array<any>;
  suggestionBoxReleasesPositionTop:number;
  selectedCurrency:any;
  suggestionBoxOriginalWorksPositionTop:number;
  currentYear:string = moment().format('YYYY');
  trackCurrentlyLoaded:string;
  trackListIndex:number;
  isPlayerPlaying:boolean = false;
  isUpdating:boolean = false;
  availableTracksToCopyFrom:any = [];
  trackToCopyFrom:any;
  trackSampleUpload:any;
  isSnippetUploading = false;
  videoFileUploader:any;
  snippetProcessingPolling:any;
  activeList:string;
  trackEditorTitle:string;


  constructor(public uploadService:UploadService,
    public tags:TagService,
    public genres:Genres,
    public originalWorks:OriginalWorks,
    public gigTypes:GigTypes,
    public releases:Releases,
    public _state:GlobalState,
    public appState:AppState,
    public zone:NgZone) {

     this._state.subscribe('track.updatingStarted', (data) => {

          this.isUpdating = true;
          
     });
     
     this._state.subscribe('track.updatingFinished', (data) => {

        this.zone.run( () => {
          
          this.isUpdating = false;
          
        })
          
     });
     
    this._state.subscribe('track.editor.show', () => {

        if(this.uploadService.trackList.results[this.trackIndexCurrentlyEditing] 
        && this.uploadService.trackList.results[this.trackIndexCurrentlyEditing] 
        && this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].customDraftSnippetFileStatus == 'processing') {
          
          var trackId = this.uploadService.trackList.results[this.trackIndexCurrentlyEditing]._id;
          
           this.snippetProcessingPolling = this.pollForProcessingStatus(trackId).subscribe( (parsedResponse) => {
            
            this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].customDraftSnippetFile = parsedResponse.Track.customDraftSnippetFile;
            this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].customDraftSnippetFileStatus = parsedResponse.Track.customDraftSnippetFileStatus;
            this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFileName = parsedResponse.Track.waveformImageSnippetFileName;
            this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFilePath = parsedResponse.Track.waveformImageSnippetFilePath;
            this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFileUrl = parsedResponse.Track.waveformImageSnippetFileUrl;

            
          });
          
        }
          
     });
     
     this._state.subscribe('track.editor.show', () => {
       
      if(this.uploadService.trackList.results[this.trackIndexCurrentlyEditing] && this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].crooklynClanv1AutoMigrated) {
        
        this.trackEditorTitle = this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].hiBitRateFile.filename.replace('tracks/draft/hi_bit_rate/', '');
        
      } else {
        
        this.trackEditorTitle = this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].originalFileName || 'Title not set';
        
      }

       
     });
     
     this._state.subscribe('track.editor.hide', () => {
          
          var trackId = this.uploadService.trackList.results[this.trackIndexCurrentlyEditing]._id;
          
          if(this.snippetProcessingPolling) {
            
            this.stopPolling();

          }

       });
     
     
     
    this._state.subscribe('currency.changed', (data) => {

          this.setupUploaderForCurrency(data);
          
    });


    }


    setupUploaderForCurrency(currency) {
      console.log('changing snippet uploader', currency);
      this.selectedCurrency = currency;
          
          this.trackSampleUpload = null;

        this.trackSampleUpload = new FileUploader({

            url: '/api/v1/members/track/update',
            itemAlias: 'sampleTrack_upload'

        });

       if(this.selectedCurrency.slug != 'video-vault') {
console.log('selected currency is not video');

          this.runAudioFileUploaderConfiguration();

        }

        if(this.selectedCurrency.slug == 'video-vault') {
console.log('selected currency is video');

          this.runVideoFileUploaderConfiguration();

        }
      
    }
    
    pollForProcessingStatus(trackId) {
      
      return Observable
        .interval(5000)
        .flatMap(() => { return this.uploadService.getTrack(trackId) })
        .first((res) => {
            return res.Track.customDraftSnippetFileStatus == 'processed'
        });

    }
    
    runAudioFileUploaderConfiguration () {
      
                this.trackSampleUpload.onAfterAddingFile = (item) => {
             // console.log(item);
             var reader = new FileReader();
             reader.onload = () => {
               var fileIndex = this.trackSampleUpload.getIndexOfItem(item);

               if(item._file.type != 'audio/mp3') {
                     this.trackSampleUpload.queue[fileIndex].isError = true;
                     this.trackSampleUpload.queue[fileIndex].isReady = false;
                     this.trackSampleUpload.queue[fileIndex].isUploaded = true;
                     this.trackSampleUpload.queue[fileIndex].isUploading = false;
                     this.trackSampleUpload.queue[fileIndex].errorMessage = "Invalid file type: must be an MP3";

                     this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Sample Rejected', detail: item._file.name + ': ' + this.trackSampleUpload.queue[fileIndex].errorMessage});
                                                            this.trackSampleUpload.queue = [];  

               } else {

                 var tags = mp3Parser.readTags(new DataView(reader.result));
                 //console.log(tags[1].header.bitrate,tags);

                 /* if(tags && tags.length > 0 && tags[1].header.bitrate != 64) {
                   this.releaseSampleUpload.queue[fileIndex].isError = true;
                   this.releaseSampleUpload.queue[fileIndex].isReady = false;
                   this.releaseSampleUpload.queue[fileIndex].isUploaded = true;
                   this.releaseSampleUpload.queue[fileIndex].isUploading = false;
                   this.releaseSampleUpload.queue[fileIndex].errorMessage = "Bit rate must be 64kbps";

                   this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Sample Rejected', detail: item._file.name + ': ' + this.releaseSampleUpload.queue[fileIndex].errorMessage});

                 } else */ if(tags.length == 0) {

                   this.trackSampleUpload.queue[fileIndex].isError = true;
                   this.trackSampleUpload.queue[fileIndex].isReady = false;
                   this.trackSampleUpload.queue[fileIndex].isUploaded = true;
                   this.trackSampleUpload.queue[fileIndex].isUploading = false;
                   this.trackSampleUpload.queue[fileIndex].errorMessage = "Invalid MP3 file";
                   this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Snippet Rejected', detail: item._file.name + ': ' + this.trackSampleUpload.queue[fileIndex].errorMessage});
                  this.trackSampleUpload.queue = [];  


                 } else {

                  this.isSnippetUploading = true;
                  this.trackSampleUpload.setOptions({url: '/api/v1/members/track/' + this.uploadService.trackList.results[this.trackIndexCurrentlyEditing]._id + '/update'});

                   this.trackSampleUpload.queue[fileIndex].upload();

                 }
               }

             };

             reader.readAsArrayBuffer(item.some);
    }

        this.trackSampleUpload.onProgressItem = (item: any, progress: any) => {
          
          this.zone.run( () => {
            
              var snippetUploadIndex = this.trackSampleUpload.queue.indexOf(item);
              this.trackSampleUpload.queue[snippetUploadIndex].actualProgress = progress;
    
          });
          
        }

      this.trackSampleUpload.onCompleteItem = (item: any, response: any, status: any, headers: any) => {

        var parsedResponse = JSON.parse(response);
        
        if(parsedResponse && parsedResponse.error) {
            
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Snippet Rejected', detail: parsedResponse.detail});
          this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].customDraftSnippetFile = false;
          this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].customDraftSnippetFileStatus = false;

          this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFileName = false;
          this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFilePath = false;
          this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFileUrl = false;

          this.trackSampleUpload.queue = [];
            
        } else {
            
          this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].customDraftSnippetFile = parsedResponse.Track.customDraftSnippetFile;
          this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].customDraftSnippetFileStatus = parsedResponse.Track.customDraftSnippetFileStatus;
  
          this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFileName = parsedResponse.Track.waveformImageSnippetFileName;
          this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFilePath = parsedResponse.Track.waveformImageSnippetFilePath;
          this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFileUrl = parsedResponse.Track.waveformImageSnippetFileUrl;
  
          this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary: 'Snippet Upload Completed', detail: parsedResponse.detail});
          this.isSnippetUploading = false;
          this.trackSampleUpload.queue = [];
             
        }

      };

      
    }
    
    runVideoFileUploaderConfiguration() {
      
      console.log('setting up video processes for snippet');
      
            this.trackSampleUpload.onAfterAddingFile = (item) => {
        var reader = new FileReader();
        reader.onload = () => {
          var fileIndex = this.trackSampleUpload.getIndexOfItem(item);
          if(item._file.trackIdToReplace) {
            this.trackSampleUpload.queue[fileIndex].alias = 'replace_track_for_' + item._file.trackIdToReplace || 'file';
          }

          if(item._file.type != 'video/mp4') {
            this.trackSampleUpload.queue[fileIndex].isError = true;
            this.trackSampleUpload.queue[fileIndex].isReady = false;
            this.trackSampleUpload.queue[fileIndex].isUploaded = true;
            this.trackSampleUpload.queue[fileIndex].isUploading = false;

            this.trackSampleUpload.queue[fileIndex].errorMessage = "Invalid file type: must be an MP4 video";
            this.uploadService.rejectedTracks.results.push({
              originalFileName: item._file.name, message: { title: this.trackSampleUpload.queue[fileIndex].errorMessage }
            });
            this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.trackSampleUpload.queue[fileIndex].errorMessage});
                                          this.trackSampleUpload.queue = [];  

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
              console.log("Appending buffer with offset "+offset);
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

                this.trackSampleUpload.queue[fileIndex].isError = true;
                this.trackSampleUpload.queue[fileIndex].isReady = false;
                this.trackSampleUpload.queue[fileIndex].isUploaded = true;
                this.trackSampleUpload.queue[fileIndex].isUploading = false;
                this.trackSampleUpload.queue[fileIndex].errorMessage = "Video track does not have an audio track.";
                this.uploadService.rejectedTracks.results.push({
                  originalFileName: item._file.name, message: { title: this.trackSampleUpload.queue[fileIndex].errorMessage }
                });
                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.trackSampleUpload.queue[fileIndex].errorMessage});
                
                                                  this.trackSampleUpload.queue = [];  


              } else if(mp4info && mp4info.audioTracks && mp4info.audioTracks[0] &&  mp4info.audioTracks[0].bitrate < 320000) {
                this.trackSampleUpload.queue[fileIndex].isError = true;
                this.trackSampleUpload.queue[fileIndex].isReady = false;
                this.trackSampleUpload.queue[fileIndex].isUploaded = true;
                this.trackSampleUpload.queue[fileIndex].isUploading = false;
                this.trackSampleUpload.queue[fileIndex].errorMessage = "Audio bitrate is below the 320Kbps minimum.";
                this.uploadService.rejectedTracks.results.push({
                  originalFileName: item._file.name, message: { title: this.trackSampleUpload.queue[fileIndex].errorMessage }
                });
                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.trackSampleUpload.queue[fileIndex].errorMessage});
                
                                                  this.trackSampleUpload.queue = [];  


              } else if(mp4info && mp4info.videoTracks && mp4info.videoTracks[0] && mp4info.videoTracks[0].bitrate < 2000000) {
                this.trackSampleUpload.queue[fileIndex].isError = true;
                this.trackSampleUpload.queue[fileIndex].isReady = false;
                this.trackSampleUpload.queue[fileIndex].isUploaded = true;
                this.trackSampleUpload.queue[fileIndex].isUploading = false;
                this.trackSampleUpload.queue[fileIndex].errorMessage = "Video bitrate is below the 2000Kbps minimum.";
                this.uploadService.rejectedTracks.push({
                  originalFileName: item._file.name, message: { title: this.trackSampleUpload.queue[fileIndex].errorMessage }
                });
                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.trackSampleUpload.queue[fileIndex].errorMessage});
                
                                                  this.trackSampleUpload.queue = [];  


              } else if(mp4info && mp4info.videoTracks && mp4info.videoTracks[0] && (mp4info.videoTracks[0].track_height < 540 || mp4info.videoTracks[0].track_width < 960)) {
                this.trackSampleUpload.queue[fileIndex].isError = true;
                this.trackSampleUpload.queue[fileIndex].isReady = false;
                this.trackSampleUpload.queue[fileIndex].isUploaded = true;
                this.trackSampleUpload.queue[fileIndex].isUploading = false;
                this.trackSampleUpload.queue[fileIndex].errorMessage = "Video frame must be at least 960px by 540px.";
                this.uploadService.rejectedTracks.results.push({
                  originalFileName: item._file.name, message: { title: this.trackSampleUpload.queue[fileIndex].errorMessage }
                });
                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.trackSampleUpload.queue[fileIndex].errorMessage});
                                  this.trackSampleUpload.queue = [];  

              } else if(tags && tags.length == 0) {

                this.trackSampleUpload.queue[fileIndex].isError = true;
                this.trackSampleUpload.queue[fileIndex].isReady = false;
                this.trackSampleUpload.queue[fileIndex].isUploaded = true;
                this.trackSampleUpload.queue[fileIndex].isUploading = false;

                this.trackSampleUpload.queue[fileIndex].errorMessage = "Invalid MP4 file";

                this.uploadService.rejectedTracks.results.push({
                  originalFileName: item._file.name, message: { title: this.trackSampleUpload.queue[fileIndex].errorMessage }
                });

                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Track Rejected', detail: item._file.name + ': ' + this.trackSampleUpload.queue[fileIndex].errorMessage});
                                  this.trackSampleUpload.queue = [];  


              } else {

                //console.log(this.selectedCurrencyId);
                this.trackSampleUpload.setOptions({url: '/api/v1/members/track/' + this.uploadService.trackList.results[this.trackIndexCurrentlyEditing]._id + '/updateVideoPreview'});

                this.trackSampleUpload.queue[fileIndex].upload();

              }


            }


          }

        };

        reader.readAsArrayBuffer(item.some);
      }

      this.trackSampleUpload.onProgressItem = (item: any, progress: any) => {

          this.zone.run( () => {
            
              var snippetUploadIndex = this.trackSampleUpload.queue.indexOf(item);
              this.trackSampleUpload.queue[snippetUploadIndex].actualProgress = progress;
    
          });

      }

      this.trackSampleUpload.onCompleteItem = (item: any, response: any, status: any, headers: any) => {

        var parsedResponse = JSON.parse(response);
        
        if(parsedResponse && parsedResponse.error) {
            
           this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Snippet Rejected', detail: parsedResponse.detail});
           this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].customDraftSnippetFile = false;
           this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].customDraftSnippetFileStatus = false;
           this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFilePath = false;
           this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFileName = false;
           this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFileUrl = false;
           this.trackSampleUpload.queue = [];
            
        } else {
            
  
          this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary: 'Snippet Upload Completed', detail: parsedResponse.detail});
          this.isSnippetUploading = false;
                    this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].customDraftSnippetFileStatus = parsedResponse.Track.customDraftSnippetFileStatus;

          this.snippetProcessingPolling = this.pollForProcessingStatus(parsedResponse.Track._id).subscribe( (parsedResponse) => {
            
            this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].customDraftSnippetFile = parsedResponse.Track.customDraftSnippetFile;
            this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].customDraftSnippetFileStatus = parsedResponse.Track.customDraftSnippetFileStatus;
            this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFileName = parsedResponse.Track.waveformImageSnippetFileName;
            this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFilePath = parsedResponse.Track.waveformImageSnippetFilePath;
            this.uploadService.trackList.results[this.trackIndexCurrentlyEditing].waveformImageSnippetFileUrl = parsedResponse.Track.waveformImageSnippetFileUrl;

            
          });
          
          this.trackSampleUpload.queue = [];
             
        }

      };

      
    }
    
    ngAfterViewInit() {
      
        this.availableTracksToCopyFrom = this.uploadService.trackList['results'];

    }

    scrollUp() {

      jQuery('.modal-body').scrollTo({top:0,left:0},500);

    }
    
    searchExistingTracks(event) {
    
    this.availableTracksToCopyFrom = this.uploadService.tracksReadyToPublish.results.filter( (track) => {
      
        if(track.name.toLowerCase().indexOf(event.query.toLowerCase()) !== -1) {
          
          return track;
          
        }
        
      });
      
    }
    
    selectExistingTracks(event) {
    
      this.trackToCopyFrom = this.uploadService.tracksReadyToPublish.results.filter( (track) => {
      
        if(track.name.toLowerCase().indexOf(event.query.toLowerCase()) !== -1) {
          return track;
        }
        
      })[0];

      this.availableTracksToCopyFrom = this.uploadService.tracksReadyToPublish.results;

    }
    
    copyTrack() {
      
      var trackToCopy = _.cloneDeep(this.trackToCopyFrom);
      
      delete trackToCopy._id;
      delete trackToCopy.createdAt;
      delete trackToCopy.updatedAt;
      delete trackToCopy.createdBy;
      delete trackToCopy.updatedBy;
      delete trackToCopy.trackLength;
      delete trackToCopy.status;
      delete trackToCopy.isSubmitted;
      delete trackToCopy.hiBitRateFileBitRate;
      delete trackToCopy.hiBitRateFile;
      delete trackToCopy.draftTrackUploadedToS3;
      delete trackToCopy.originalFileName;
      delete trackToCopy.fileType;
      delete trackToCopy.enabled;
      delete trackToCopy.currency;
      delete trackToCopy.creditValue;
      delete trackToCopy.assignedCollections;
      delete trackToCopy.crooklynClanv1Active;
      delete trackToCopy.crooklynClanv1AutoMigrated;
      delete trackToCopy.crooklynClanv1CatId;
      delete trackToCopy.crooklynClanv1Disabled;
      delete trackToCopy.crooklynClanv1Popularity;
      delete trackToCopy.crooklynClanv1ProductCode;
      delete trackToCopy.crooklynClanv1ProductID;
      delete trackToCopy.customDraftSnippetFile;
      delete trackToCopy.customDraftSnippetFileStatus;
      delete trackToCopy.isTrackValid;
      delete trackToCopy.publishDate;
      delete trackToCopy.waveformImageFileName;
      delete trackToCopy.waveformImageFilePath;
      delete trackToCopy.waveformImageFileUrl;
      delete trackToCopy.waveformImageSnippetFileName;
      delete trackToCopy.waveformImageSnippetFilePath;
      delete trackToCopy.waveformImageSnippetFileUrl;
      delete trackToCopy.formattedName;
      delete trackToCopy.releases;
      delete trackToCopy.__v;

      trackToCopy.isChanged = true;
          
      this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing] = Object.assign(this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing],trackToCopy);
      this.trackToCopyFrom = null;

    }
    
    getSuggestedOriginalWorks($event, criteria) {

     // console.log('Attempting to search: ', criteria, $event);

      this.originalWorks.searchOriginalWorks(criteria).subscribe(res =>  {

        var existingOriginalWorks = this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].originalWorks.map(function(originalWork) {
          return originalWork._id;
        });

        var suggestedOriginalWorks = res.OriginalWorks.results.filter((originalWork) => {
          if(existingOriginalWorks.indexOf(originalWork._id) === -1 ) {
            return originalWork;
          }
        });

        switch($event.originalEvent.srcElement.parentElement.parentElement.id) {
            case 'originalWorkName': {

              this.suggestedOriginalWorksFromName = suggestedOriginalWorks;
              break;

            }
            case 'originalWorkVersion': {

              this.suggestedOriginalWorksFromVersion = suggestedOriginalWorks;
              break;

            }
            case 'originalWorkArtists': {

              this.suggestedOriginalWorksFromArtists = suggestedOriginalWorks;
              break;
            }
            case 'originalWorkArtistsFeatured': {

              this.suggestedOriginalWorksFromArtistsFeatured = suggestedOriginalWorks;
              break;

            }
        }


       /* if(this.suggestedOriginalWorks.length > 0) {
          this.showSuggestedOriginalWorks = true;
        } else {
          this.showSuggestedOriginalWorks = false;
        } */
        this.suggestionBoxOriginalWorksPositionTop = $event.originalEvent.srcElement.offsetTop + $event.originalEvent.srcElement.offsetHeight;
        //console.log("Source element information: ", this, this.suggestionBoxOriginalWorksPositionTop);


      });

    }

    getSuggestedReleases(event) {

      //console.log('Attempting to search: ', event);

      this.releases.searchReleases(event.query).subscribe(res =>  {

        this.suggestedReleases = res.Releases.filter((release) => {
          return this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].releases.indexOf(release) === -1;
        });

       // console.log(this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].releases, this.suggestedReleases);

      });

    }

    addOriginalWorkToTrack(trackIndex,draftOriginalWork) {

      //console.log("How the original work is compiled: ", draftOriginalWork);

      if(typeof draftOriginalWork.artists == 'object') {
        draftOriginalWork.artists = draftOriginalWork.artistsDisplayName
      }

      if(typeof draftOriginalWork.artistsFeatured == 'object') {
        draftOriginalWork.artistsFeatured = draftOriginalWork.artistsFeaturedDisplayName
      }
      
      var formattedOriginalWorks = [];
      
      if(draftOriginalWork.name) {
        formattedOriginalWorks.push(draftOriginalWork.name)
      }
      
      if(draftOriginalWork.version) {
        formattedOriginalWorks.push('(' + draftOriginalWork.version + ')');
      }
      
      if(draftOriginalWork.artists) {
        formattedOriginalWorks.push(draftOriginalWork.artists);
      }
      
      if(draftOriginalWork.artistsFeatured) {
        formattedOriginalWorks.push('(' + draftOriginalWork.artistsFeatured + ')');
      }
      
      this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].originalWorks.push(draftOriginalWork);
      this.uploadService.updateField('draftOriginalWorks', this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].originalWorks, this.trackIndexCurrentlyEditing,this.currentTrackList);
      this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Original Work Added', detail: formattedOriginalWorks.join(' ') });
      this.suggestedOriginalWorksFromName = this.suggestedOriginalWorksFromVersion = this.suggestedOriginalWorksFromArtists = this.suggestedOriginalWorksFromArtistsFeatured = null;
      this.draftOriginalWork = this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].draftOriginalWork = {name: '', version: '', artists: '', artistsFeatured: ''};

    }

    removeOriginalWorkToTrack(originalWorkIndex) {

      this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].originalWorks.splice(originalWorkIndex,1);
      this.uploadService.updateField('draftOriginalWorks', this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].originalWorks, this.trackIndexCurrentlyEditing,this.currentTrackList);

    }


    
    hideModal() {
      
      this._state.notifyDataChanged('track.editor.hide', {});
      this.modal.hide();
      
    }
    
    stopPolling() {
      
      if(this.snippetProcessingPolling) {
        
        this.snippetProcessingPolling.unsubscribe();
        
      }
      
      
    }

    goToNextTrack() {
              var trackIndexCurrentlyEditing = this.trackIndexCurrentlyEditing;

            var track = this.uploadService.trackList.results[trackIndexCurrentlyEditing];

      this.uploadService.updateTrack(track).subscribe( (res) => {
        
        this.uploadService.trackList.results[trackIndexCurrentlyEditing] = res.Track;
         
        this.uploadService.updateTrackValidationStatus(trackIndexCurrentlyEditing);
        this.uploadService.trackList.results[trackIndexCurrentlyEditing].isChanged = false;

        this.uploadService.updateTracksByValidationStatus();


        this.draftOriginalWork = {name: '', version: '', artists: '', artistsFeatured: ''};
        this.draftRelease = {name: ''};
                          this._state.notifyDataChanged('track.updatingFinished', {});


      
      var tabListIndex = this.uploadService[this.activeList].results.findIndex( (item) => {
          
          return track._id.toString() == item._id.toString();
          
      });
      
      var nextTabListIndex;

      if(this.uploadService[this.activeList].results.length > 1 && tabListIndex < this.uploadService[this.activeList].results.length - 1 && this.uploadService[this.activeList].results[tabListIndex + 1].draftTrackUploadedToS3 == true) {
        
        nextTabListIndex = tabListIndex + 1;
        
      } else if ( this.uploadService[this.activeList].results.length == 1 ) {
        
        nextTabListIndex = 0;
        
      } else {
        
        nextTabListIndex = -1;
        
      }
      
      if(nextTabListIndex !== -1 && this.uploadService[this.activeList].results.length > 0) {
        
        var nextTabListTrackIndex = this.uploadService.trackList.results.findIndex( (item) => {
          
          return this.uploadService[this.activeList].results[nextTabListIndex]._id.toString() == item._id.toString();
          
        });
        
        this._state.notifyDataChanged('track.editor.hide', {});
        this.trackIndexCurrentlyEditing = nextTabListTrackIndex;
        jQuery('.modal-body').scrollTo({top:0,left:0},500);
        this._state.notifyDataChanged('track.editor.show', {});


      } else {
        
        this.hideModal();

      }

        
      }, (err) => {
        var message, errorMessage;
          if(err && err._body) {
           errorMessage = JSON.parse(err._body);
          }
          
          if(errorMessage && errorMessage.detail) {
            
            message = errorMessage.detail;
            
          }
        
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Error', detail: message});
          this._state.notifyDataChanged('track.updatingFinished', {});
          
      });

    }
    
    goToPreviousTrack() {

      var trackIndexCurrentlyEditing = this.trackIndexCurrentlyEditing;

      var track = this.uploadService.trackList.results[trackIndexCurrentlyEditing];
      
      
      this.uploadService.updateTrack(track).subscribe( (res) => {
        
        this.uploadService.trackList.results[trackIndexCurrentlyEditing] = res.Track;
         
        this.uploadService.updateTrackValidationStatus(trackIndexCurrentlyEditing);
        this.uploadService.trackList.results[trackIndexCurrentlyEditing].isChanged = false;
                this.uploadService.updateTracksByValidationStatus();

        this.draftOriginalWork = {name: '', version: '', artists: '', artistsFeatured: ''};
        this.draftRelease = {name: ''};
        this._state.notifyDataChanged('track.updatingFinished', {});

      var tabListIndex = this.uploadService[this.activeList].results.findIndex( (item) => {
          
          return track._id.toString() == item._id.toString();
          
      });
      
      var prevTabListIndex;

      if(this.uploadService[this.activeList].results.length > 1 && tabListIndex <= this.uploadService[this.activeList].results.length - 1 && this.uploadService[this.activeList].results[tabListIndex - 1].draftTrackUploadedToS3 == true) {
        
        prevTabListIndex = tabListIndex - 1;
        
      } else if ( this.uploadService[this.activeList].results.length == 1 ) {
        
        prevTabListIndex = 0;
        
      } else {
        
        prevTabListIndex = -1;
        
      }
      console.log(prevTabListIndex);
      if(prevTabListIndex !== -1 && this.uploadService[this.activeList].results.length > 0) {
        
        var prevTabListTrackIndex = this.uploadService.trackList.results.findIndex( (item) => {
          
          return this.uploadService[this.activeList].results[prevTabListIndex]._id.toString() == item._id.toString();
          
        });

        this._state.notifyDataChanged('track.editor.hide', {});
        this.trackIndexCurrentlyEditing = prevTabListTrackIndex;
        jQuery('.modal-body').scrollTo({top:0,left:0},500);
        this._state.notifyDataChanged('track.editor.show', {});


      } else {
        
        this.hideModal();

      }

      }, (err) => {
        var message, errorMessage;
          if(err && err._body) {
           errorMessage = JSON.parse(err._body);
          }
          
          if(errorMessage && errorMessage.detail) {
            
            message = errorMessage.detail;
            
          }
        
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Error', detail: message});
          this._state.notifyDataChanged('track.updatingFinished', {});
          
      });


    }
    
    toggleTrackIsOriginal($event) {

      if(this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].isOriginal) {
        this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].originalWorks = [
          { name: this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].name,
            artists: this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].artistText,
            version: this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].version,
            artistsFeatured: this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].artistsFeaturedText,
            isOriginalWorkEntry: true
          }];
        } else {

         // this.originalWorks.removeOriginalWorkByTrack(this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing]._id).subscribe( (res) => {

         //   if(res.success) {

              this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].originalWorks = [];

         //   }

        //  });

        }
        this.uploadService.updateField('draftOriginalWorks', this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].originalWorks, this.trackIndexCurrentlyEditing,this.currentTrackList);

      }
      
      setGigType() {
        var gigTypeEntry = this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].gigTypeEntry;
        
        var gigTypeFormattedRecord = gigTypeEntry.name + ' ' + gigTypeEntry.djTiming + '-' + gigTypeEntry.energy + '-' + gigTypeEntry.popularity;
        
        this.uploadService.updateField('gigTypeEntry',this.uploadService.trackList['results'][this.trackIndexCurrentlyEditing].gigTypeEntry,this.trackIndexCurrentlyEditing,this.currentTrackList);
        this._state.notifyDataChanged('growlNotifications.update', {severity:'info', summary:'Gig Type Added', detail: gigTypeFormattedRecord });

      }
      
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
      
      togglePlayPausePreview (track) {
        
        var trackPlayerData = {
          name: track.name  || '[title not set]',
          version: track.version || '[version not set]',
          artistPrimaryName: track.artistPrimaryName  || '[artist not set]',
          artistsFeaturedPrimaryName: track.artistsFeaturedPrimaryName,
          _id: track._id,
          url: track.customDraftSnippetFile.url,
          waveformUrl: track.waveformImageSnippetFileUrl || 'none',
          fileType: track.fileType
        }
      
        this._state.notifyDataChanged('player.toggle', trackPlayerData);

      };


    }
