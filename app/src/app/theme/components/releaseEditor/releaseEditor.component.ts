import {Component, ViewChild, HostListener, Renderer, ElementRef, AfterViewInit, NgZone} from '@angular/core';
import {NgStyle} from '@angular/common';
import {BaCard, BaCheckbox} from '../';
import { GlobalState } from '../../../global.state';
import {TagService, Genres, OriginalWorks, GigTypes, Releases,UploadService} from '../../services';
import {FilterAlreadySelectedGenres,FilterTagOptionsForSetting} from '../../pipes/listFilters';
import { ModalDirective } from 'ng2-bootstrap/ng2-bootstrap';
import { OverlayPanel } from 'primeng/primeng';
import * as moment from 'moment';
import { FileUploader } from 'ng2-file-upload/ng2-file-upload';
import {mp3Parser} from './releaseEditor.loader.ts';
declare var MP4Box;

declare var jQuery;
declare var $;

@Component({
  selector: 'release-editor',
  template: require('./releaseEditor.html'),
  styles: [require('./releaseEditor.scss')],
})

export class ReleaseEditor implements AfterViewInit {
  @ViewChild('releaseEditorModal') public modal: ModalDirective;
  @ViewChild('releaseName') releaseNameField: ElementRef;
  
  releaseIndexCurrentlyEditing:number;
  suggestionBoxReleasesPositionTop:number;
  suggestionBoxOriginalWorksPositionTop:number;
  isPlayerPlaying:boolean = false;
  selectedCurrencyId:string;
  selectedCurrency:any;
  selectedUploader:any = {queue: []};
  fileUploader:any;
  videoFileUploader:any;
  newReleaseName:string;
  newReleaseIsUnique:boolean = true;
  isSnippetUploading = false;
  selectedCurrencySlug:string;
  releaseId:string;
  currencyMediaType:string;
  
  constructor(public uploadService:UploadService,
    public tags:TagService,
    public genres:Genres,
    public originalWorks:OriginalWorks,
    public gigTypes:GigTypes,
    public releases:Releases,
    public _state:GlobalState,
    private renderer: Renderer,
    public zone: NgZone) {
      
      this._state.subscribe('release.editor.show', (currency) => {
        
        this.configureSnippetUploader(currency);
        
      });
      
      this._state.subscribe('currency.changed', (currency) => {
        
        this.configureSnippetUploader(currency);
        
      });
      
    }
    
    configureSnippetUploader(currency) {
      
      this.selectedCurrencyId = currency._id;
      this.selectedCurrencySlug = currency.slug;
      this.currencyMediaType = currency.mediaType;
      console.log('release editor aware of currency change', currency);
      if(currency.slug != 'video-vault') {
        
        this.fileUploader = new FileUploader({
          
          url: '/api/v1/members/releases/' + this.releaseId + '/update',
          itemAlias: 'sampleTrack_upload'
          
        });
        
        
        this.runAudioFileUploaderConfiguration();
        this.selectedUploader = this.fileUploader;
        
      }
      
      if(currency.slug == 'video-vault') {
        
        this.videoFileUploader = new FileUploader({
          
          url: '/api/v1/members/releases/' + this.releaseId + '/update',
          itemAlias: 'sampleTrack_upload'
          
        });
        
        this.runVideoFileUploaderConfiguration();
        this.selectedUploader = this.videoFileUploader;
        
      }
      
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
            this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Snippet Rejected', detail: item._file.name + ': ' + this.fileUploader.queue[fileIndex].errorMessage});
            this.fileUploader.queue = [];
            
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
              this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Snippet Rejected', detail: item._file.name + ': ' + this.fileUploader.queue[fileIndex].errorMessage});
              this.fileUploader.queue = [];
              
            } else if(tags.length == 0) {
              
              this.fileUploader.queue[fileIndex].isError = true;
              this.fileUploader.queue[fileIndex].isReady = false;
              this.fileUploader.queue[fileIndex].isUploaded = true;
              this.fileUploader.queue[fileIndex].isUploading = false;
              this.fileUploader.queue[fileIndex].errorMessage = "Invalid MP3 file";
              
              this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Snippet Rejected', detail: item._file.name + ': ' + this.fileUploader.queue[fileIndex].errorMessage});
              this.fileUploader.queue = [];
              
              
            } else {
              
              //console.log(this.selectedCurrencyId);
              this.isSnippetUploading = true;
              this.fileUploader.queue[fileIndex].url = '/api/v1/members/releases/' + this.releaseId + '/update';
              this.fileUploader.queue[fileIndex].upload();
              
            }
          }
          
        };
        
        reader.readAsArrayBuffer(item.some);
      }
      
      this.fileUploader.onProgressItem = (item: any, progress: any) => {
        this.zone.run( () => {
          var uploadQueueItemIndex = this.fileUploader.queue.indexOf(item);
          this.fileUploader.queue[uploadQueueItemIndex].actualProgress = progress;
          
        });
        
      }
      
      this.fileUploader.onCompleteItem = (item: any, response: any, status: any, headers: any) => {
        var parsedResponse = JSON.parse(response);
        
        if(parsedResponse && parsedResponse.error) {
          
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Snippet Rejected', detail: parsedResponse.detail});
          this.releases.draftList[this.releaseIndexCurrentlyEditing].crooklynClanv1SampleTrackFileName = false;
          this.fileUploader.queue = [];
          
        } else {
          
          this.releases.draftList[this.releaseIndexCurrentlyEditing].crooklynClanv1SampleTrackUrl = parsedResponse.Release.crooklynClanv1SampleTrackUrl;
          this.releases.draftList[this.releaseIndexCurrentlyEditing].crooklynClanv1SampleTrackFileName = parsedResponse.Release.crooklynClanv1SampleTrackFileName;
          this.releases.draftList[this.releaseIndexCurrentlyEditing].crooklynClanv1SampleTrackOriginalFileName = parsedResponse.Release.crooklynClanv1SampleTrackOriginalFileName;
          this.releases.draftList[this.releaseIndexCurrentlyEditing].waveformImageSnippetFileUrl = parsedResponse.Release.waveformImageSnippetFileUrl;
          
          this.releases.draftList[this.releaseIndexCurrentlyEditing].validation = this.releases.validateRelease(this.releaseIndexCurrentlyEditing, this.selectedCurrency);
          this._state.notifyDataChanged('releases.updated', {releases: this.releases.draftList});
          this.isSnippetUploading = false;
          this.fileUploader.queue = [];
          
        }
      };
      
    }
    
    runVideoFileUploaderConfiguration() {
      
      this.videoFileUploader.onAfterAddingFile = (item) => {
        this.releaseId = this.releases.draftList[this.releaseIndexCurrentlyEditing]._id;
        
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
            this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Preview Rejected', detail: item._file.name + ': ' + this.videoFileUploader.queue[fileIndex].errorMessage});
            
            this.videoFileUploader.queue = [];
            
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
              
              if(mp4info && mp4info.audioTracks && mp4info.audioTracks[0] &&  mp4info.audioTracks[0].bitrate < 320000) {
                this.videoFileUploader.queue[fileIndex].isError = true;
                this.videoFileUploader.queue[fileIndex].isReady = false;
                this.videoFileUploader.queue[fileIndex].isUploaded = true;
                this.videoFileUploader.queue[fileIndex].isUploading = false;
                this.videoFileUploader.queue[fileIndex].errorMessage = "Audio bitrate is below the 320Kbps minimum.";
                
                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Preview Rejected', detail: item._file.name + ': ' + this.videoFileUploader.queue[fileIndex].errorMessage});
                
                this.videoFileUploader.queue = [];
                
                
              } else if(mp4info && mp4info.videoTracks && mp4info.videoTracks[0] && mp4info.videoTracks[0].bitrate < 2000000) {
                this.videoFileUploader.queue[fileIndex].isError = true;
                this.videoFileUploader.queue[fileIndex].isReady = false;
                this.videoFileUploader.queue[fileIndex].isUploaded = true;
                this.videoFileUploader.queue[fileIndex].isUploading = false;
                this.videoFileUploader.queue[fileIndex].errorMessage = "Video bitrate is below the 2000Kbps minimum.";
                
                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Preview Rejected', detail: item._file.name + ': ' + this.videoFileUploader.queue[fileIndex].errorMessage});
                
                this.videoFileUploader.queue = [];
                
                
              } else if(mp4info && mp4info.videoTracks && mp4info.videoTracks[0] && (mp4info.videoTracks[0].track_height < 540 || mp4info.videoTracks[0].track_width < 960)) {
                this.videoFileUploader.queue[fileIndex].isError = true;
                this.videoFileUploader.queue[fileIndex].isReady = false;
                this.videoFileUploader.queue[fileIndex].isUploaded = true;
                this.videoFileUploader.queue[fileIndex].isUploading = false;
                this.videoFileUploader.queue[fileIndex].errorMessage = "Video frame must be at least 960px by 540px.";
                
                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Preview Rejected', detail: item._file.name + ': ' + this.videoFileUploader.queue[fileIndex].errorMessage});
                this.videoFileUploader.queue = [];
                
                
              } else if(tags && tags.length == 0) {
                
                this.videoFileUploader.queue[fileIndex].isError = true;
                this.videoFileUploader.queue[fileIndex].isReady = false;
                this.videoFileUploader.queue[fileIndex].isUploaded = true;
                this.videoFileUploader.queue[fileIndex].isUploading = false;
                this.videoFileUploader.queue[fileIndex].errorMessage = "Invalid MP4 file";
                
                this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Preview Rejected', detail: item._file.name + ': ' + this.videoFileUploader.queue[fileIndex].errorMessage});
                
                this.videoFileUploader.queue = [];
                
                
                
              } else {
                
                //console.log(this.selectedCurrencyId);
                
                this.isSnippetUploading = true;
                this.videoFileUploader.queue[fileIndex].url = '/api/v1/members/releases/' + this.releaseId + '/update';
                this.videoFileUploader.queue[fileIndex].upload();
                
              }
              
              
            }
            
            
          }
          
        };
        
        reader.readAsArrayBuffer(item.some);
      }
      
      this.videoFileUploader.onProgressItem = (item: any, progress: any) => {
        
        this.zone.run( () => {
          
          var snippetUploadIndex = this.videoFileUploader.queue.indexOf(item);
          this.videoFileUploader.queue[snippetUploadIndex].actualProgress = progress;
          
        });
        
      }
      
      this.videoFileUploader.onCompleteItem = (item: any, response: any, status: any, headers: any) => {
        var parsedResponse = JSON.parse(response);
        
        if(parsedResponse && parsedResponse.error) {
          
          this._state.notifyDataChanged('growlNotifications.update', {severity:'error', summary:'Snippet Rejected', detail: parsedResponse.detail});
          this.releases.draftList[this.releaseIndexCurrentlyEditing].crooklynClanv1SampleTrackFileName = false;
          this.videoFileUploader.queue = [];
          
        } else {
          
          this.releases.draftList[this.releaseIndexCurrentlyEditing].crooklynClanv1SampleTrackUrl = parsedResponse.Release.crooklynClanv1SampleTrackUrl;
          this.releases.draftList[this.releaseIndexCurrentlyEditing].crooklynClanv1SampleTrackFileName = parsedResponse.Release.crooklynClanv1SampleTrackFileName;
          this.releases.draftList[this.releaseIndexCurrentlyEditing].crooklynClanv1SampleTrackOriginalFileName = parsedResponse.Release.crooklynClanv1SampleTrackOriginalFileName;
          this.releases.draftList[this.releaseIndexCurrentlyEditing].validation = this.releases.validateRelease(this.releaseIndexCurrentlyEditing, this.selectedCurrency);
          this._state.notifyDataChanged('releases.updated', {releases: this.releases.draftList});
          this.isSnippetUploading = false;
          this.videoFileUploader.queue = [];
          
        }
      };
      
    }
    
    
    ngOnInit() {
      
      
      
      console.log(this.tags);
      
      
    }
    
    ngAfterViewInit() {            
      
      
      
      
      this.renderer.invokeElementMethod(this.releaseNameField.nativeElement, 'focus');
    }
    
    scrollUp() {
      
      jQuery('.modal-body').scrollTo({top:0,left:0},500);
      
    }
    
    togglePlayPause (release) {
      
      var trackPlayerData = {
        name: release.name  || '[title not set]',
        version: 'Preview Snippet',
        artistPrimaryName: '',
        artistsFeaturedPrimaryName: '',
        _id: release._id,
        url: release.crooklynClanv1SampleTrackUrl,
        waveformUrl: release.waveformImageSnippetFileUrl,
        fileType: 'audio',
        releaseSnippet: true
      }

      this._state.notifyDataChanged('player.toggle', trackPlayerData);
      
    };
    
    updateRelease(release) {
      
      var releaseIndex = this.releases.draftList.indexOf(release);
      
      this.releases.updateRelease(release).subscribe( (res) => {
        
        this.releases.draftList[releaseIndex] = res.Release;
        this.releases.draftList[releaseIndex].validation = this.releases.validateRelease(releaseIndex, this.selectedCurrency);
        this._state.notifyDataChanged('releases.updated', {releases: this.releases.draftList});
        
      });
      
    }
    
    updateGenres(releaseIndex, genre) {
      
      var genreIndex = this.releases.draftList[releaseIndex].genres.indexOf(genre.id);
      var release = this.releases.draftList[releaseIndex];
      
      if(genreIndex !== -1) {
        
        release.genres.splice(genreIndex, 1);
        this.releases.updateRelease(release).subscribe( (res) => {
          
          this.releases.draftList[releaseIndex] = res.Release;
          this.releases.draftList[releaseIndex].validation = this.releases.validateRelease(releaseIndex, this.selectedCurrency);
          
          this._state.notifyDataChanged('releases.updated', {releases: this.releases.draftList});
          
        });
        
        
      } else {
        
        if(release.genres.length <= 2) {
          
          release.genres.push(genre.id);
          this.releases.updateRelease(release).subscribe( (res) => {
            
            this.releases.draftList[releaseIndex] = res.Release;
            this.releases.draftList[releaseIndex].validation = this.releases.validateRelease(releaseIndex, this.selectedCurrency);
            
            this._state.notifyDataChanged('releases.updated', {releases: this.releases.draftList});
            
          });
          
        }
      }
    }
    
    checkAgainstDuplicateReleaseName(releaseName, releaseId) {
      var releaseId = releaseId || false;
      this.releases.checkAgainstDuplicateReleaseName(releaseName).subscribe( (res) => {
        
        if(res && res.Release && releaseId != res.Release._id) {
          this.newReleaseIsUnique = false;
        } else {
          this.newReleaseIsUnique = true;
        }
        
      });
      
    }
    
    createRelease(releaseName, mediaType) {
      
      this.releases.createRelease(releaseName, mediaType, this.selectedCurrencyId).subscribe( (res) => {
        
        var newRelease = res.Release;
        this.releaseId = newRelease._id;
        this.releases.getTracksByDraftRelease(this.selectedCurrencyId).subscribe( (draftList) => {
          
          this.releases.draftList = draftList.Releases;
          this.releases.draftList.find( (release, index) => {
            this.releaseIndexCurrentlyEditing = (release._id == newRelease._id) ? index : -1;
            this.releases.draftList[index].validation = this.releases.validateRelease(index, this.selectedCurrency);
            return release._id == newRelease._id;
          });
          
          this.newReleaseName = null;
          
          this._state.notifyDataChanged('releases.created', {release: newRelease});
          
          this._state.notifyDataChanged('releases.updated', {releases: draftList.Releases});
          
          this.selectedUploader.setOptions({url: '/api/v1/members/releases/' + newRelease._id + '/update' });
          
        });
        
      });
      
    }
    
  }
